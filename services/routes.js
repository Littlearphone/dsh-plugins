/**
 * Services — HTTP surface.
 *
 * One prefix route under `/services`; the browser half is the only caller.
 */
import { join } from 'node:path';
import {
  hashString,
  normaliseConfig,
  readConfigs,
  readDoc,
  scriptKey,
  withConfig,
  writeDoc,
} from './config.js';
import {
  MAX_BODY_BYTES,
  gradleGroups,
  mavenGroups,
  ROUTE_PATH,
  goGroups,
  packageDirs,
  readManifest,
  workspaceGlobs,
} from './discover.js';
import {
  listServices,
  restartService,
  serviceOutput,
  spawnService,
  stopService,
} from './processes.js';
/** The public shape of one run; a record also carries its handle, which cannot be sent. */
export function describeService(record) {
  return {
    id: record.id,
    name: record.name,
    command: record.command,
    dir: record.dir,
    state: record.state,
  };
}
export async function readBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('body-too-large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function reply(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}
export function createHandler(ctx) {
  return async function handle(request, response) {
    // Same-origin only: another page must not read or start this machine's work.
    const origin = request.headers.origin;
    const host = request.headers.host;
    if (
      origin !== undefined &&
      host !== undefined &&
      origin !== 'http://' + host &&
      origin !== 'https://' + host
    ) {
      reply(response, 403, { error: 'cross-origin' });
      return;
    }

    const url = new URL(request.url ?? '/', 'http://localhost');
    const rest = url.pathname.startsWith(ROUTE_PATH + '/')
      ? url.pathname.slice(ROUTE_PATH.length + 1)
      : '';
    const slash = rest.indexOf('/');
    const action = slash === -1 ? rest : rest.slice(0, slash);
    const rawId = slash === -1 ? '' : rest.slice(slash + 1);
    const ACTIONS = ['list', 'start', 'stop', 'restart', 'state', 'output', 'config', 'pin', 'ui'];
    if (!ACTIONS.includes(action)) {
      reply(response, 404, { error: 'not-found' });
      return;
    }

    let sessionId;
    try {
      sessionId = decodeURIComponent(rawId);
    } catch (error) {
      reply(response, 400, { error: 'bad-session' });
      return;
    }

    const sessions = ctx.get('sessions');
    const workingDirectory = ctx.get('workingDirectory');
    if (sessions === undefined || workingDirectory === undefined) {
      reply(response, 503, { error: 'unavailable', detail: 'sessions or workingDirectory' });
      return;
    }
    const session = sessions.get(sessionId);
    if (session === undefined) {
      reply(response, 404, { error: 'unknown-session' });
      return;
    }

    let dir;
    try {
      dir = workingDirectory.get(session);
    } catch (error) {
      reply(response, 500, { error: 'no-directory' });
      return;
    }

    // --- process control -------------------------------------------------
    if (action === 'state') {
      reply(response, 200, { services: listServices(dir) });
      return;
    }

    if (action === 'output') {
      const id = url.searchParams.get('id') ?? '';
      const output = serviceOutput(dir, id);
      if (output === undefined) {
        reply(response, 404, { error: 'unknown-service' });
        return;
      }
      reply(response, 200, output);
      return;
    }


    if (action === 'start') {
      let body = {};
      try {
        body = JSON.parse(await readBody(request));
      } catch {
        reply(response, 400, { error: 'bad-body' });
        return;
      }
      const cwd = body.dir === undefined || body.dir === '' ? dir : join(dir, String(body.dir));
      const started = await spawnService(
        ctx,
        sessionId,
        { name: body.name, command: body.command, source: body.source, dir: body.dir, kind: body.kind, cwd },
        dir,
      );
      if (started.error !== undefined) {
        reply(response, 500, started);
        return;
      }
      const record = started.record;
      reply(response, 200, { service: describeService(record) });
      return;
    }

    if (action === 'stop' || action === 'restart') {
      let body = {};
      try {
        body = JSON.parse(await readBody(request));
      } catch {
        reply(response, 400, { error: 'bad-body' });
        return;
      }
      const id = String(body.id ?? '');
      if (id === '') {
        reply(response, 400, { error: 'bad-id' });
        return;
      }
      if (action === 'stop') {
        const stopped = await stopService(dir, id);
        if (stopped.error === 'unknown-service') {
          reply(response, 404, stopped);
          return;
        }
        if (stopped.error !== undefined) {
          reply(response, 500, stopped);
          return;
        }
        reply(response, 200, { ok: true });
        return;
      }
      const restarted = await restartService(ctx, sessionId, dir, id);
      if (restarted.error === 'unknown-service') {
        reply(response, 404, restarted);
        return;
      }
      if (restarted.error === 'not-running') {
        // The poll the browser already has is about to show this; refusing here
        // keeps a restart from resurrecting a run that has just exited.
        reply(response, 409, restarted);
        return;
      }
      if (restarted.error !== undefined) {
        reply(response, 500, restarted);
        return;
      }
      reply(response, 200, {
        service: describeService(restarted.record),
        previous: restarted.previous,
      });
      return;
    }

    // --- view state ------------------------------------------------------
    if (action === 'ui') {
      if (String(request.method ?? 'GET').toUpperCase() !== 'PUT') {
        reply(response, 405, { error: 'method-not-allowed' });
        return;
      }
      let body = {};
      try {
        body = JSON.parse(await readBody(request));
      } catch {
        reply(response, 400, { error: 'bad-body' });
        return;
      }
      const doc = await readDoc(dir);
      const collapsed = Array.isArray(body.collapsed)
        ? body.collapsed.filter((id) => typeof id === 'string')
        : doc.collapsed;
      const selected = { ...doc.selected };
      if (typeof body.dir === 'string' && typeof body.script === 'string') {
        const key = scriptKey(body.dir, body.script);
        if (body.configId === undefined || body.configId === '') delete selected[key];
        else selected[key] = String(body.configId);
      }
      await writeDoc(dir, { ...doc, collapsed, selected });
      reply(response, 200, { collapsed, selected });
      return;
    }

    // --- pinning ---------------------------------------------------------
    if (action === 'pin') {
      let body = {};
      try {
        body = JSON.parse(await readBody(request));
      } catch {
        reply(response, 400, { error: 'bad-body' });
        return;
      }
      const targetDir = String(body.dir ?? '');
      const targetScript = String(body.script ?? '');
      if (targetScript === '') {
        reply(response, 400, { error: 'bad-script' });
        return;
      }
      const doc = await readDoc(dir);
      const rest = doc.pinned.filter(
        (entry) => !(entry.dir === targetDir && entry.script === targetScript),
      );
      if (body.pinned !== false) rest.push({ dir: targetDir, script: targetScript });
      await writeDoc(dir, { ...doc, pinned: rest });
      reply(response, 200, { pinned: rest });
      return;
    }

    // --- start configurations --------------------------------------------
    if (action === 'config') {
      const method = String(request.method ?? 'GET').toUpperCase();
      if (method === 'GET') {
        reply(response, 200, { configs: await readConfigs(dir) });
        return;
      }
      if (method === 'DELETE') {
        const targetId = url.searchParams.get('id') ?? '';
        const targetDir = url.searchParams.get('dir') ?? '';
        const targetScript = url.searchParams.get('script') ?? '';
        const doc = await readDoc(dir);
        const kept = doc.configs.filter((config) =>
          targetId !== ''
            ? config.id !== targetId
            : !(config.dir === targetDir && config.script === targetScript),
        );
        const selected = { ...doc.selected };
        if (targetId !== '') {
          for (const [key, value] of Object.entries(selected)) {
            if (value === targetId) delete selected[key];
          }
        } else {
          delete selected[scriptKey(targetDir, targetScript)];
        }
        await writeDoc(dir, { ...doc, configs: kept, selected });
        reply(response, 200, { configs: kept });
        return;
      }
      if (method === 'PUT' || method === 'POST') {
        let body = {};
        try {
          body = JSON.parse(await readBody(request));
        } catch {
          reply(response, 400, { error: 'bad-body' });
          return;
        }
        // `command` is deliberately not part of this: the script body belongs to
        // package.json, so a variant can only add parameters, env and a cwd.
        const draft = normaliseConfig(body);
        if (draft === undefined) {
          reply(response, 400, { error: 'bad-config' });
          return;
        }
        const doc = await readDoc(dir);
        const id =
          typeof body.id === 'string' && body.id !== '' ? body.id : 'c-' + hashString(JSON.stringify(draft) + Date.now());
        const config = { ...draft, id };
        const next = doc.configs.filter((entry) => entry.id !== id);
        // An empty variant is a deletion, not a blank entry.
        const empty =
          config.label === undefined &&
          config.args === undefined &&
          config.env === undefined &&
          config.cwd === undefined;
        if (!empty) next.push(config);
        next.sort((left, right) =>
          (left.dir + '\u0000' + left.script + '\u0000' + (left.label ?? '')).localeCompare(
            right.dir + '\u0000' + right.script + '\u0000' + (right.label ?? ''),
          ),
        );
        const selected = { ...doc.selected, [scriptKey(config.dir, config.script)]: id };
        await writeDoc(dir, { ...doc, configs: next, selected });
        reply(response, 200, { configs: next, id });
        return;
      }
      reply(response, 405, { error: 'method-not-allowed' });
      return;
    }

    // --- discovery -------------------------------------------------------
    try {
      const root = await readManifest(dir);
      const globs = await workspaceGlobs(dir, root);
      const { dirs, skipped } = await packageDirs(dir, globs);

      const groups = [];
      if (root !== undefined) {
        groups.push({ id: 'root', kind: 'npm', name: root.name, dir: '', scripts: root.scripts });
      }
      for (const relative of dirs) {
        const manifest = await readManifest(join(dir, relative));
        if (manifest === undefined) continue;
        groups.push({
          id: relative,
          kind: 'npm',
          // Path, not package name: nine packages in one workspace can share the
          // name "frontend", and a title that repeats cannot be told apart.
          name: relative === '' ? manifest.name || 'root' : relative,
          pkg: manifest.name,
          dir: relative,
          scripts: manifest.scripts,
        });
      }
      for (const go of await goGroups(dir)) groups.push(go);
      for (const maven of await mavenGroups(dir, dirs)) groups.push(maven);
      for (const gradle of await gradleGroups(dir, dirs)) groups.push(gradle);

      const doc = await readDoc(dir);
      for (const group of groups) {
        group.scripts = group.scripts.map((script) => {
          const merged = withConfig(script, group.dir, doc);
          const key = scriptKey(group.dir, script.name);
          return {
            ...merged,
            // Every script carries its package.json name, overridden or not: the
            // editor and the pin toggle both post this value back as identity.
            original: script.name,
            pinned: doc.pinned.some(
              (entry) => entry.dir === group.dir && entry.script === script.name,
            ),
            lastStartedAt: Number(doc.recent[key] ?? 0),
          };
        });
      }

      groups.sort((left, right) => {
        if (left.dir === '' && right.dir !== '') return -1;
        if (right.dir === '' && left.dir !== '') return 1;
        return left.name.localeCompare(right.name);
      });

      reply(response, 200, {
        dir,
        hasManifest: root !== undefined,
        groups: groups.filter((group) => group.scripts.length > 0),
        collapsed: doc.collapsed,
        workspacePatterns: globs,
        skippedPatterns: skipped,
      });
    } catch (error) {
      reply(response, 500, { error: 'unreadable', detail: String(error?.message ?? error) });
    }
  };
}
