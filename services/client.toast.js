/**
 * Services — overlay toasts for finished runs.
 */
window.__ModuleLoader__.load({
  id: '@local/services',
  chunk: 'client.toast.js',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    function createToast(d) {
      const { t, store, useLocaleRevision, useStoreRevision, CSS, dismissToast, focusService, openPanel } = d;

      /**
       * Fixed bottom-right stack. The overlay layer is click-through, so the
       * container is pointer-events:none and each card opts back in for its
       * close button.
       */
      function ToastOverlay() {
        useLocaleRevision();
        useStoreRevision();
        if (store.toasts.length === 0) return null;
        return h(
          'div',
          { className: 'dsh-svc-toasts', 'aria-live': 'polite' },
          h('style', { key: 'css' }, CSS),
          store.toasts.map((toast) => {
            const failed =
              toast.state === 'failed' ||
              (toast.exitCode !== null && toast.exitCode !== undefined && Number(toast.exitCode) !== 0);
            const detail = [t(failed ? 'toast.failed' : 'toast.done')];
            if (toast.exitCode !== null && toast.exitCode !== undefined) {
              detail.push(t('toast.exitCode') + ' ' + String(toast.exitCode));
            }
            const openFailed = () => {
              focusService({ serviceId: toast.serviceId, key: toast.key, dir: toast.dir });
              dismissToast(toast.id);
              try {
                openPanel();
              } catch (error) {
                console.error('[services] cannot open the panel', error);
              }
            };
            return h(
              'div',
              {
                key: toast.id,
                className: 'dsh-svc-toast' + (failed ? ' is-error' : ' is-ok'),
                'data-svc-toast': toast.state,
                role: failed ? 'alert' : 'status',
              },
              h(
                'span',
                { className: 'dsh-svc-toast-mark', 'aria-hidden': true },
                failed ? '!' : '✓',
              ),
              h(
                'span',
                { className: 'dsh-svc-toast-text', key: 'text' },
                h(
                  'span',
                  { className: 'dsh-svc-toast-name', key: 'name' },
                  String(toast.name || t('toast.service')),
                ),
                h('span', { className: 'dsh-svc-toast-detail', key: 'detail' }, detail.join(' · ')),
                toast.command === undefined || toast.command === ''
                  ? null
                  : h(
                      'span',
                      { className: 'dsh-svc-toast-command', key: 'command' },
                      String(toast.command),
                    ),
                failed
                  ? h(
                      'button',
                      {
                        key: 'open',
                        type: 'button',
                        className: 'dsh-svc-toast-action',
                        onClick: openFailed,
                      },
                      t('toast.openPanel'),
                    )
                  : null,
              ),
              h(
                'button',
                {
                  key: 'close',
                  type: 'button',
                  className: 'dsh-svc-toast-close',
                  title: t('toast.close'),
                  'aria-label': t('toast.close'),
                  onClick: () => dismissToast(toast.id),
                },
                '×',
              ),
            );
          }),
        );
      }

      return { ToastOverlay };
    }

    return { createToast };
  },
});
