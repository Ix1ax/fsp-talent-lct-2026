type FocusGuardOptions = { limit: number; storageKey?: string };

export const createFocusGuard = ({ limit, storageKey }: FocusGuardOptions) => {
  let violations = 0;
  let storageError = '';
  const reportStorageError = () => {
    storageError =
      'Не удалось сохранить счётчик уходов со страницы. Контроль продолжается, но счётчик может потеряться при перезагрузке.';
  };

  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());

  const start = (browser: Window) => {
    let away = false;
    if (storageKey) {
      try {
        violations = Math.min(
          limit,
          Math.max(0, Number(browser.sessionStorage.getItem(storageKey)) || 0),
        );
      } catch {
        reportStorageError();
      }
      notify();
    }
    const leave = () => {
      if (away || violations >= limit) return;
      away = true;
      violations += 1;
      if (storageKey) {
        try {
          browser.sessionStorage.setItem(storageKey, String(violations));
        } catch {
          reportStorageError();
        }
      }
      notify();
    };
    const returnToPage = () => {
      if (
        browser.document.visibilityState === 'visible' &&
        browser.document.hasFocus()
      )
        away = false;
    };
    const visibilityChanged = () => {
      if (browser.document.visibilityState === 'hidden') leave();
      else returnToPage();
    };
    browser.addEventListener('blur', leave);
    browser.addEventListener('focus', returnToPage);
    browser.document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      browser.removeEventListener('blur', leave);
      browser.removeEventListener('focus', returnToPage);
      browser.document.removeEventListener(
        'visibilitychange',
        visibilityChanged,
      );
    };
  };
  return {
    start,
    getSnapshot: () => violations,
    getStorageError: () => storageError,
    getServerStorageError: () => '',
    getServerSnapshot: () => 0,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
