/**
 * Services — installing a tool from the panel.
 *
 * The Host owns the download (a job it reports on); this half lists what is
 * downloadable, starts one, and polls until it lands. Two entry points only: the
 * "+" next to the Maven runner and the one next to the JDK picker.
 */
window.__ModuleLoader__.load({
  id: '@local/services',
  chunk: 'client.download.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function createDownload(d) {
      const { t, DL_ROUTE, useLocaleRevision } = d;

      /** `12345678` → `11.8 MB`; a job without a total still shows something. */
      function megabytes(bytes) {
        return (Number(bytes ?? 0) / 1048576).toFixed(1) + ' MB';
      }

      function DownloadControl({ sessionId, kind, onInstalled }) {
        useLocaleRevision();
        const url = DL_ROUTE + encodeURIComponent(String(sessionId));
        const [open, setOpen] = React.useState(false);
        const [catalog, setCatalog] = React.useState(undefined);
        const [vendor, setVendor] = React.useState('');
        const [version, setVersion] = React.useState('');
        const [job, setJob] = React.useState(undefined);
        const [error, setError] = React.useState('');
        // The callback changes identity on every parent render; the poll must not
        // restart because of that.
        const installedRef = React.useRef(onInstalled);
        installedRef.current = onInstalled;

        const load = React.useCallback(() => {
          fetch(url)
            .then((response) =>
              response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status)),
            )
            .then((data) => {
              setCatalog(data);
              if (kind === 'jdk') {
                const first = data?.jdk?.vendors?.[0];
                setVendor((current) => current || first?.id || '');
                setVersion(String(first?.versions?.[0] ?? ''));
              } else {
                setVersion(String(data?.maven?.versions?.[0] ?? ''));
              }
            })
            .catch((failure) => setError(String(failure?.message ?? failure)));
        }, [url, kind]);

        // Poll while a job runs: the Host downloads, this only watches. The
        // effect is keyed by the job id, so a finished job stops the timer.
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
          } catch (failure) {
            setError(String(failure?.message ?? failure));
          }
        };

        const vendors = catalog?.jdk?.vendors ?? [];
        const versions =
          kind === 'jdk'
            ? vendors.find((entry) => entry.id === vendor)?.versions ?? []
            : catalog?.maven?.versions ?? [];
        const running = job?.state === 'running';
        const status =
          job === undefined
            ? ''
            : running
              ? job.phase === 'extracting'
                ? t('dl.extracting')
                : t('dl.downloading') + ' ' + megabytes(job.received) + ' / ' + megabytes(job.total)
              : job.state === 'done'
                ? t('dl.done') + ' · ' + job.name
                : t('dl.failed') + ' · ' + job.error;

        return h(
          'span',
          { className: 'dsh-svc-dl' },
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-svc-icon is-tiny' + (open ? ' is-active' : ''),
              title: kind === 'jdk' ? t('dl.addJdk') : t('dl.addMaven'),
              'aria-label': kind === 'jdk' ? t('dl.addJdk') : t('dl.addMaven'),
              onClick: () => {
                const next = !open;
                setOpen(next);
                if (next && catalog === undefined) load();
              },
            },
            '+',
          ),
          open
            ? h(
                'span',
                { className: 'dsh-svc-dl-form' },
                kind === 'jdk'
                  ? h(
                      'select',
                      {
                        className: 'dsh-svc-input is-tiny',
                        value: vendor,
                        onChange: (event) => {
                          setVendor(event.target.value);
                          const next = vendors.find((entry) => entry.id === event.target.value);
                          setVersion(String(next?.versions?.[0] ?? ''));
                        },
                      },
                      vendors.map((entry) =>
                        h('option', { key: entry.id, value: entry.id }, entry.label),
                      ),
                    )
                  : null,
                h(
                  'select',
                  {
                    className: 'dsh-svc-input is-tiny',
                    value: version,
                    onChange: (event) => setVersion(event.target.value),
                  },
                  versions.map((entry) =>
                    h('option', { key: String(entry), value: String(entry) }, String(entry)),
                  ),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-svc-dl-start',
                    disabled: running || version === '',
                    onClick: () => void start(),
                  },
                  running ? t('dl.installing') : t('dl.install'),
                ),
                status === '' ? null : h('span', { className: 'dsh-svc-dl-status' }, status),
                error === '' ? null : h('span', { className: 'dsh-svc-dl-status is-error' }, error),
              )
            : null,
        );
      }

      return { DownloadControl };
    }

    return { createDownload };
  },
});
