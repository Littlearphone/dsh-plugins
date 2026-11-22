/**
 * Services — installing a tool from the panel.
 *
 * The Host owns the download (a job it reports on); this half shows what is
 * downloadable, starts one, and polls. The panel is a block under the field it
 * belongs to, never a popover: an empty catalog used to squeeze four controls
 * into a 40px line, which read as a layout bug.
 */
window.__ModuleLoader__.load({
  id: '@local/services',
  chunk: 'client.download.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function createDownload(d) {
      const { t, DL_ROUTE, useLocaleRevision } = d;

      /** `12345678` → `11.8 MB`; a job without a size still shows something. */
      function megabytes(bytes) {
        return (Number(bytes ?? 0) / 1048576).toFixed(1) + ' MB';
      }

      /**
       * The install panel for one tool: catalog → choice → job → progress. The
       * loading state keeps a fixed height so the drawer does not jump when the
       * Host answers.
       */
      function DownloadPanel({ sessionId, kind, onClose, onInstalled }) {
        useLocaleRevision();
        const url = DL_ROUTE + encodeURIComponent(String(sessionId));
        const [catalog, setCatalog] = React.useState(undefined);
        const [failure, setFailure] = React.useState('');
        const [vendor, setVendor] = React.useState('');
        const [version, setVersion] = React.useState('');
        const [job, setJob] = React.useState(undefined);
        const [error, setError] = React.useState('');
        // The callback changes identity on every parent render; the poll must not
        // restart because of that.
        const installedRef = React.useRef(onInstalled);
        installedRef.current = onInstalled;

        React.useEffect(() => {
          let alive = true;
          fetch(url)
            .then((response) =>
              response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status)),
            )
            .then((data) => {
              if (!alive) return;
              setCatalog(data);
              if (kind === 'jdk') {
                const first = data?.jdk?.vendors?.[0];
                setVendor(first?.id ?? '');
                setVersion(String(first?.versions?.[0] ?? ''));
              } else {
                setVersion(String(data?.maven?.versions?.[0] ?? ''));
              }
            })
            .catch((reason) => {
              if (alive) setFailure(String(reason?.message ?? reason));
            });
          return () => {
            alive = false;
          };
        }, [url, kind]);

        React.useEffect(() => {
          if (job === undefined || job.state !== 'running') return undefined;
          let alive = true;
          const timer = setInterval(async () => {
            try {
              const response = await fetch(url);
              if (!response.ok) return;
              const data = await response.json();
              const next = (data.jobs ?? []).find((entry) => entry.id === job.id);
              if (!alive || next === undefined) return;
              setJob(next);
              if (next.state !== 'running') installedRef.current?.(next);
            } catch {
              /* the next tick retries */
            }
          }, 1000);
          return () => {
            alive = false;
            clearInterval(timer);
          };
        }, [job, url]);

        const start = async () => {
          setError('');
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ kind, vendor, version }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(String(data?.job?.error ?? 'HTTP ' + response.status));
            }
            setJob(data.job);
          } catch (reason) {
            setError(String(reason?.message ?? reason));
          }
        };

        const header = h(
          'div',
          { className: 'dsh-svc-dl-head', key: 'head' },
          h('span', null, kind === 'jdk' ? t('dl.installJdk') : t('dl.installMaven')),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-svc-card-close',
              title: t('dl.close'),
              'aria-label': t('dl.close'),
              onClick: () => {
                if (typeof onClose === 'function') onClose();
              },
            },
            '×',
          ),
        );

        if (catalog === undefined) {
          return h(
            'div',
            { className: 'dsh-svc-dl-panel' },
            header,
            failure === ''
              ? h(
                  'div',
                  { className: 'dsh-svc-dl-loading' },
                  h('span', { className: 'dsh-svc-spinner' }),
                  t('dl.reading'),
                )
              : h('p', { className: 'dsh-svc-dl-status is-error' }, t('dl.failed') + ' · ' + failure),
          );
        }

        const vendors = catalog?.jdk?.vendors ?? [];
        const versions =
          kind === 'jdk'
            ? vendors.find((entry) => entry.id === vendor)?.versions ?? []
            : catalog?.maven?.versions ?? [];
        const running = job?.state === 'running';
        const percent =
          running && Number(job.total) > 0
            ? Math.min(100, Math.round((Number(job.received) / Number(job.total)) * 100))
            : 0;
        const status =
          job === undefined
            ? ''
            : running
              ? job.phase === 'extracting'
                ? t('dl.extracting')
                : megabytes(job.received) + ' / ' + megabytes(job.total)
              : job.state === 'done'
                ? t('dl.done') + ' · ' + job.name
                : t('dl.failed') + ' · ' + job.error;

        return h(
          'div',
          { className: 'dsh-svc-dl-panel' },
          header,
          kind === 'jdk'
            ? h(
                'label',
                { className: 'dsh-svc-field', key: 'vendor' },
                h('span', { className: 'dsh-svc-field-label' }, t('dl.vendor')),
                h(
                  'select',
                  {
                    className: 'dsh-svc-input',
                    value: vendor,
                    disabled: running,
                    onChange: (event) => {
                      setVendor(event.target.value);
                      const next = vendors.find((entry) => entry.id === event.target.value);
                      setVersion(String(next?.versions?.[0] ?? ''));
                    },
                  },
                  vendors.map((entry) => h('option', { key: entry.id, value: entry.id }, entry.label)),
                ),
              )
            : null,
          h(
            'label',
            { className: 'dsh-svc-field', key: 'version' },
            h('span', { className: 'dsh-svc-field-label' }, t('dl.version')),
            h(
              'select',
              {
                className: 'dsh-svc-input',
                value: version,
                disabled: running,
                onChange: (event) => setVersion(event.target.value),
              },
              versions.map((entry) =>
                h('option', { key: String(entry), value: String(entry) }, String(entry)),
              ),
            ),
          ),
          running
            ? h(
                'div',
                { className: 'dsh-svc-progress', key: 'progress' },
                h('span', { className: 'dsh-svc-progress-fill', style: { width: percent + '%' } }),
              )
            : null,
          h(
            'div',
            { className: 'dsh-svc-dl-actions', key: 'actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-svc-btn is-primary',
                disabled: running || version === '',
                onClick: () => void start(),
              },
              running ? t('dl.installing') : t('dl.install'),
            ),
            status === '' ? null : h('span', { className: 'dsh-svc-dl-status' }, status),
          ),
          error === '' ? null : h('p', { className: 'dsh-svc-dl-status is-error' }, error),
        );
      }

      return { DownloadPanel };
    }

    return { createDownload };
  },
});
