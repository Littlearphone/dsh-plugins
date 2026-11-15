/**
 * Host half of the sidebar-notes bundle: the durable note store.
 *
 * Why a Host store and not `localStorage`: the browser arrays storage by
 * *origin*, and the Web GUI's origin includes the listening port. A `dsh web`
 * run on an OS-assigned port therefore starts with an empty `localStorage`
 * every time — which is also why the right Sidebar's own layout (keyed
 * `dsh.sidebar-right.v1.<sessionId>` in the page) resets for such runs.
 * Anything a plugin must keep belongs on the Host side instead.
 *
 * The store is one JSON document keyed by Session under `$DSH_HOME`, served to
 * the browser half over a same-origin route. A relative route is what makes the
 * page work on any port: it never hard-codes an origin.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

/** Route the browser half calls, relative to the page origin. */
const ROUTE_PATH = '/sidebar-notes/notes';
/** One note larger than this is refused rather than allowed to grow the file unboundedly. */
const MAX_BODY_BYTES = 256 * 1024;

/** `$DSH_HOME/sidebar-notes/notes.json`, with the documented fallback when the variable is absent. */
function dataFile() {
  const home = process.env.DSH_HOME ?? join(homedir(), '.dsh');
  return join(home, 'sidebar-notes', 'notes.json');
}

/**
 * One JSON document, loaded on first use and written atomically.
 * Reads are served from memory; writes queue so two edits cannot interleave.
 */
function createStore(file) {
  /** @type {Map<string, string> | undefined} */
  let notes;
  let writeChain = Promise.resolve();

  async function load() {
    if (notes !== undefined) return notes;
    notes = new Map();
    try {
      const parsed = JSON.parse(await readFile(file, 'utf8'));
      const stored = parsed !== null && typeof parsed === 'object' ? parsed.notes : undefined;
      if (stored !== null && typeof stored === 'object') {
        for (const [sessionId, text] of Object.entries(stored)) {
          if (typeof text === 'string') notes.set(sessionId, text);
        }
      }
    } catch (error) {
      // A missing or unreadable file is an empty store; the next write creates it.
      if (error?.code !== 'ENOENT') console.error('[sidebar-notes] cannot read', file, error);
    }
    return notes;
  }

  async function flush() {
    const current = await load();
    const document = { version: 1, notes: Object.fromEntries(current) };
    await mkdir(dirname(file), { recursive: true });
    const temporary = file + '.tmp';
    await writeFile(temporary, JSON.stringify(document), 'utf8');
    await rename(temporary, file);
  }

  return {
    async read(sessionId) {
      return (await load()).get(sessionId) ?? '';
    },
    async write(sessionId, text) {
      const current = await load();
      if (text === '') current.delete(sessionId);
      else current.set(sessionId, text);
      writeChain = writeChain.then(flush, flush);
      return writeChain;
    },
  };
}

/** Answer one request; body reads are bounded so a large upload cannot sit in memory. */
async function readBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('body-too-large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function reply(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}

function createHandler(store) {
  return async function handle(request, response) {
    // Same-origin only: a page from another origin may not read or write notes.
    const origin = request.headers.origin;
    const host = request.headers.host;
    if (origin !== undefined && host !== undefined && origin !== 'http://' + host && origin !== 'https://' + host) {
      reply(response, 403, { error: 'cross-origin' });
      return;
    }

    const path = (request.url ?? '').split('?')[0] ?? '';
    const raw = path.startsWith(ROUTE_PATH) ? path.slice(ROUTE_PATH.length) : '';
    if (!raw.startsWith('/')) {
      reply(response, 404, { error: 'not-found' });
      return;
    }
    let sessionId;
    try {
      sessionId = decodeURIComponent(raw.slice(1));
    } catch (error) {
      reply(response, 400, { error: 'bad-session' });
      return;
    }
    if (sessionId === '') {
      reply(response, 400, { error: 'bad-session' });
      return;
    }

    if (request.method === 'GET') {
      try {
        reply(response, 200, { text: await store.read(sessionId) });
      } catch (error) {
        reply(response, 500, { error: 'read-failed' });
      }
      return;
    }

    if (request.method === 'PUT' || request.method === 'POST') {
      try {
        const parsed = JSON.parse(await readBody(request));
        const text = typeof parsed?.text === 'string' ? parsed.text : undefined;
        if (text === undefined) {
          reply(response, 400, { error: 'bad-body' });
          return;
        }
        await store.write(sessionId, text);
        reply(response, 200, { ok: true });
      } catch (error) {
        reply(response, error?.message === 'body-too-large' ? 413 : 400, { error: 'write-failed' });
      }
      return;
    }

    response.writeHead(405, { allow: 'GET, PUT' });
    response.end();
  };
}

/** The Web server carries the route; without it this half stays inactive. */
export const inject = ['webServer'];

/**
 * Register the notes route for the plugin's lifetime.
 * @param ctx - Host plugin context.
 */
export function apply(ctx) {
  const server = ctx.get('webServer');
  if (server === undefined) {
    console.error('[sidebar-notes] the web server service is unavailable; notes stay browser-local');
    return;
  }
  const store = createStore(dataFile());
  const handler = createHandler(store);
  ctx.effect(
    () => server.register({ kind: 'prefix', path: ROUTE_PATH, handler }),
    'sidebar-notes: notes route',
  );
}
