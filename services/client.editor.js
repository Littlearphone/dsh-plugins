/**
 * Services — the start-configuration editor and the output view.
 */
window.__ModuleLoader__.load({
  id: '@local/services',
  chunk: 'client.editor.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function createEditor(d) {
      const { t, CONFIG_ROUTE, OUTPUT_ROUTE, store, emit } = d;

    function ConfigEditor({ sessionId, script, dir, labels, jdkInfo, onSaved, onCancel }) {
      const scriptName = script.original ?? script.name;
      const kind = String(script.category ?? '');
      // Maven rows choose their runner and JDK; Java rows run through the same
      // runner, so they take both too. Gradle and the no-build-tool (`javac`)
      // rows share the JDK field alone, and npm scripts get none of it.
      const isMaven = kind === 'maven' || kind === 'java';
      const isJvm = isMaven || kind === 'gradle' || kind === 'javac';
      const [label, setLabel] = React.useState(script.variantLabel ?? '');
      const [args, setArgs] = React.useState(script.args ?? '');
      const [env, setEnv] = React.useState(
        Object.entries(script.env ?? {})
          .map(([key, value]) => key + '=' + value)
          .join('\n'),
      );
      const [cwd, setCwd] = React.useState(script.cwd ?? '');
      const [runner, setRunner] = React.useState(script.runner ?? '');
      const [jdk, setJdk] = React.useState(script.jdk ?? '');
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');
      // A saved runner may no longer be installed; keep it selectable so saving
      // the form again does not silently change the choice.
      const runners = Array.isArray(script.runners) ? script.runners : [];
      const runnerChoices =
        runner === '' || runners.includes(runner) ? runners : [runner, ...runners];
      const jdkOptions = Array.isArray(jdkInfo?.options) ? jdkInfo.options : [];
      const detectedJdk = typeof jdkInfo?.project === 'string' ? jdkInfo.project : '';
      // The JDK field is a picker *and* a text field: a saved path that no scan
      // found (a JDK outside ~/.jdks) must start in the free-text part, or the
      // select would silently fall back to "auto" for a real choice.
      const customJdkOption = '__custom__';
      const [customJdk, setCustomJdk] = React.useState(
        script.jdk !== undefined &&
          script.jdk !== '' &&
          !jdkOptions.some((option) => option.home === script.jdk),
      );

      const save = async (reset) => {
        setBusy(true);
        setError('');
        try {
          const url = CONFIG_ROUTE + encodeURIComponent(String(sessionId));
          if (reset === true) {
            const query =
              script.configId === undefined
                ? '?dir=' + encodeURIComponent(dir ?? '') + '&script=' + encodeURIComponent(scriptName)
                : '?id=' + encodeURIComponent(String(script.configId));
            const response = await fetch(url + query, { method: 'DELETE' });
            if (!response.ok) {
              const detail = await response.json().catch(() => null);
              throw new Error('HTTP ' + response.status + ' ' + String(detail?.error ?? ''));
            }
          } else {
            const envEntries = {};
            for (const line of env.split(/\r?\n/)) {
              const trimmed = line.trim();
              if (trimmed === '' || trimmed.startsWith('#')) continue;
              const at = trimmed.indexOf('=');
              if (at <= 0) throw new Error(labels.badEnv + ': ' + trimmed);
              envEntries[trimmed.slice(0, at).trim()] = trimmed.slice(at + 1);
            }
            const response = await fetch(url, {
              method: 'PUT',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                id: script.configId ?? undefined,
                dir: dir ?? '',
                script: scriptName,
                label: label.trim(),
                args: args.trim(),
                env: envEntries,
                cwd: cwd.trim(),
                runner: isMaven ? runner : '',
                jdk: isJvm ? jdk.trim() : '',
              }),
            });
            if (!response.ok) {
              const detail = await response.json().catch(() => null);
              throw new Error('HTTP ' + response.status + ' ' + String(detail?.error ?? ''));
            }
          }
          setBusy(false);
          if (typeof onSaved === 'function') onSaved();
        } catch (failure) {
          setBusy(false);
          setError(String(failure?.message ?? failure));
        }
      };

      const field = (key, value, onChange, placeholder) =>
        h(
          'label',
          { className: 'dsh-svc-field', key },
          h('span', { className: 'dsh-svc-field-label' }, labels[key]),
          h('input', {
            className: 'dsh-svc-input',
            value,
            spellCheck: false,
            placeholder: placeholder ?? '',
            onChange: (event) => onChange(event.target.value),
          }),
        );

      return h(
        'div',
        { className: 'dsh-svc-drawer dsh-svc-editor' },
        h(
          'div',
          { className: 'dsh-svc-drawer-head' },
          h('span', { className: 'dsh-svc-drawer-title' }, labels.title + ' · ' + scriptName),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-svc-run-button',
              onClick: () => {
                if (typeof onCancel === 'function') onCancel();
              },
            },
            labels.close,
          ),
        ),
        h(
          'div',
          { className: 'dsh-svc-readonly', title: labels.locked },
          h('span', { className: 'dsh-svc-lock', 'aria-hidden': true }, '🔒'),
          h('code', { className: 'dsh-svc-readonly-text' }, script.command),
          h('span', { className: 'dsh-svc-readonly-note' }, labels.locked),
        ),
        isMaven
          ? h(
              'label',
              { className: 'dsh-svc-field', key: 'runner' },
              h('span', { className: 'dsh-svc-field-label' }, labels.runner),
              h(
                'select',
                {
                  className: 'dsh-svc-input',
                  value: runner,
                  onChange: (event) => setRunner(event.target.value),
                },
                h(
                  'option',
                  { value: '' },
                  labels.runnerAuto + (runners.length === 0 ? '' : ' · ' + runners[0]),
                ),
                runnerChoices.map((choice) => h('option', { key: choice, value: choice }, choice)),
              ),
            )
          : null,
        isJvm
          ? h(
              'label',
              { className: 'dsh-svc-field', key: 'jdk' },
              h('span', { className: 'dsh-svc-field-label' }, labels.jdk),
              h(
                'select',
                {
                  className: 'dsh-svc-input',
                  value: customJdk ? customJdkOption : jdk,
                  onChange: (event) => {
                    const value = event.target.value;
                    if (value === customJdkOption) {
                      setCustomJdk(true);
                      if (!customJdk) setJdk('');
                      return;
                    }
                    setCustomJdk(false);
                    setJdk(value);
                  },
                },
                h(
                  'option',
                  { value: '' },
                  labels.jdkAuto + (detectedJdk === '' ? '' : ' · ' + detectedJdk),
                ),
                jdkOptions.map((option) =>
                  h(
                    'option',
                    { key: option.home, value: option.home, title: option.home },
                    option.name,
                  ),
                ),
                h('option', { value: customJdkOption }, labels.jdkCustom),
              ),
            )
          : null,
        isJvm && customJdk
          ? h(
              'label',
              { className: 'dsh-svc-field', key: 'jdk-path' },
              h('span', { className: 'dsh-svc-field-label' }, ''),
              h('input', {
                className: 'dsh-svc-input',
                value: jdk,
                spellCheck: false,
                placeholder: labels.jdkPathHint,
                onChange: (event) => setJdk(event.target.value),
              }),
            )
          : null,
        field('name', label, setLabel, script.name),
        field('args', args, setArgs, labels.argsHint),
        h(
          'label',
          { className: 'dsh-svc-field' },
          h('span', { className: 'dsh-svc-field-label' }, labels.env),
          h('textarea', {
            className: 'dsh-svc-input dsh-svc-textarea',
            value: env,
            spellCheck: false,
            rows: 2,
            placeholder: 'KEY=VALUE',
            onChange: (event) => setEnv(event.target.value),
          }),
        ),
        field('cwd', cwd, setCwd, labels.cwdHint),
        error === '' ? null : h('p', { className: 'dsh-svc-notice is-error' }, error),
        h(
          'div',
          { className: 'dsh-svc-editor-actions' },
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-svc-icon is-primary',
              title: labels.save,
              'aria-label': labels.save,
              disabled: busy,
              onClick: () => void save(false),
            },
            h(
              'svg',
              { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
              h('path', {
                d: 'M3.5 8.5 6.5 11.5 12.5 4.5',
                stroke: 'currentColor',
                strokeWidth: 1.6,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }),
            ),
          ),
          script.overridden === true
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-svc-icon',
                  title: labels.reset,
                  'aria-label': labels.reset,
                  disabled: busy,
                  onClick: () => void save(true),
                },
                h(
                  'svg',
                  { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
                  h('path', {
                    d: 'M4 6.5A5 5 0 1 1 5.5 11',
                    stroke: 'currentColor',
                    strokeWidth: 1.4,
                    strokeLinecap: 'round',
                  }),
                ),
              )
            : null,
        ),
      );
    }

    /**
     * A started service's collected output, polled while its view is open. It
     * carries its own header and close control, so leaving it never depends on
     * finding the row again, and the id/status make an empty result diagnosable.
     */
    function OutputView({ sessionId, id, name, labels, onClose }) {
      const [text, setText] = React.useState('');
      const [issue, setIssue] = React.useState('');
      const [loaded, setLoaded] = React.useState(false);
      const [truncated, setTruncated] = React.useState(false);
      // Line wrapping is a reading preference, not a per-run decision, so it is
      // remembered per browser rather than per service.
      const [wrap, setWrap] = React.useState(() => {
        try {
          return window.localStorage.getItem('dsh.services.logWrap') === '1';
        } catch {
          return false;
        }
      });
      const toggleWrap = () => {
        setWrap((current) => {
          const next = !current;
          try {
            window.localStorage.setItem('dsh.services.logWrap', next ? '1' : '0');
          } catch {
            /* storage may be unavailable */
          }
          return next;
        });
      };
      React.useEffect(() => {
        let alive = true;
        const tick = async () => {
          const url =
            OUTPUT_ROUTE + encodeURIComponent(String(sessionId)) + '?id=' + encodeURIComponent(String(id));
          try {
            const response = await fetch(url);
            if (!response.ok) {
              if (alive) setIssue('HTTP ' + response.status + ' · ' + url);
              return;
            }
            const data = await response.json();
            if (!alive) return;
            setLoaded(true);
            if (typeof data?.text === 'string') {
              setText(data.text);
              setTruncated(data.truncated === true);
              setIssue('');
            }
          } catch (error) {
            if (alive) setIssue(String(error?.message ?? error) + ' · ' + url);
          }
        };
        void tick();
        const timer = setInterval(tick, 1200);
        return () => {
          alive = false;
          clearInterval(timer);
        };
      }, [sessionId, id]);
      // The Host already sends only the tail; this caps what the DOM ever holds,
      // so a chatty service cannot turn the drawer into a multi-megabyte node.
      const lines = text.split(/\r?\n/);
      const tail = lines.slice(Math.max(0, lines.length - 400)).join('\n');
      const body =
        issue !== ''
          ? issue
          : tail !== ''
            ? (truncated && labels?.truncated ? String(labels.truncated) + '\n' : '') + tail
            : loaded
              ? String(labels?.waiting ?? '')
              : String(labels?.reading ?? '');
      // A log card, not another list row: its own bordered frame, a header band
      // that carries the title and the run state, then the scrolling body.
      return h(
        'div',
        { className: 'dsh-svc-log' },
        h(
          'div',
          { className: 'dsh-svc-log-head' },
          h(
            'span',
            { className: 'dsh-svc-log-title' },
            String(labels?.title ?? 'output') + ' · ' + (name ?? ''),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-svc-icon is-tiny' + (wrap ? ' is-active' : ''),
              title: wrap ? labels?.noWrap : labels?.wrap,
              'aria-label': wrap ? labels?.noWrap : labels?.wrap,
              'aria-pressed': wrap ? 'true' : 'false',
              onClick: toggleWrap,
            },
            h(
              'svg',
              { viewBox: '0 0 16 16', 'aria-hidden': true, fill: 'none' },
              h('path', {
                d: 'M3 4.5h10M3 8h6.5a2.5 2.5 0 0 1 0 5H6',
                stroke: 'currentColor',
                strokeWidth: 1.3,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }),
              wrap
                ? h('path', {
                    d: 'M7.2 11 5.2 13l2 2',
                    stroke: 'currentColor',
                    strokeWidth: 1.3,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                  })
                : h('path', {
                    d: 'M3.2 13 12.8 3',
                    stroke: 'currentColor',
                    strokeWidth: 1.3,
                    strokeLinecap: 'round',
                  }),
            ),
          ),
          h(
            'span',
            { className: 'dsh-svc-log-meta' },
            String(id),
            labels?.state === undefined ? '' : ' · ' + String(labels.state),
          ),
        ),
        h('pre', { className: 'dsh-svc-log-body' + (wrap ? ' is-wrap' : '') }, body),
      );
    }




      return { ConfigEditor, OutputView };
    }

    return { createEditor };
  },
});