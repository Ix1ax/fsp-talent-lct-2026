const message = 'Есть несохранённые изменения. Продолжить без сохранения?';
const historyKey = '__fspDraftHistory';
// Next can retain an earlier wrapper across a Strict Mode effect restart.
// Nested wrappers must commit the index chosen by the active outer guard.
let historyWriteIndex: number | undefined;

type DraftOptions = {
  preserveWithin?: readonly string[];
  scopeSearchParams?: readonly string[];
};

export const leavesCurrentPage = (href: string, current: string) => {
  const destination = new URL(href, current);
  const source = new URL(current);
  if (!['http:', 'https:'].includes(destination.protocol)) return false;
  return (
    destination.origin !== source.origin ||
    destination.pathname !== source.pathname ||
    destination.search !== source.search
  );
};

export const preservesDraft = (
  href: string,
  current: string,
  paths: readonly string[] = [],
  scopeSearchParams: readonly string[] = [],
) => {
  const destination = new URL(href, current);
  const source = new URL(current);
  return (
    destination.origin === source.origin &&
    paths.includes(source.pathname) &&
    paths.includes(destination.pathname) &&
    scopeSearchParams.every(
      (key) =>
        destination.searchParams.get(key) === source.searchParams.get(key),
    )
  );
};

export const createUnsavedChangesGuard = (browser: Window) => {
  const drafts = new Map<symbol, DraftOptions>();
  let approvedDepth = 0;
  let approvedClick = false;
  let approvedHref: string | null = null;
  let approvedUnload = false;
  let previousFocus: Element | null = null;
  let restoring = false;
  let currentHref = browser.location.href;
  let currentIndex = Number(browser.history.state?.[historyKey]) || 0;
  const originalPush = browser.history.pushState;
  const originalReplace = browser.history.replaceState;
  const stamp = (state: unknown, index: number) => ({
    ...(state && typeof state === 'object' ? state : {}),
    [historyKey]: index,
  });
  originalReplace.call(
    browser.history,
    stamp(browser.history.state, currentIndex),
    '',
    currentHref,
  );

  const restoreFocus = () => {
    const target = previousFocus;
    browser.requestAnimationFrame(() => {
      if (target?.isConnected && 'focus' in target)
        (target as HTMLElement).focus({ preventScroll: true });
    });
  };
  const rememberFocus = () => {
    previousFocus = browser.document.activeElement;
  };
  const confirm = () => {
    if (browser.confirm(message)) return true;
    restoreFocus();
    return false;
  };
  const needsConfirmation = (href: string) =>
    leavesCurrentPage(href, currentHref) &&
    [...drafts.values()].some(
      ({ preserveWithin, scopeSearchParams }) =>
        !preservesDraft(href, currentHref, preserveWithin, scopeSearchParams),
    );
  const runApproved = (action: () => void) => {
    approvedDepth++;
    try {
      action();
    } finally {
      approvedDepth--;
    }
  };
  const navigate = (href: string, action: () => void) => {
    if (
      !approvedDepth &&
      !approvedClick &&
      needsConfirmation(href) &&
      !confirm()
    )
      return false;
    runApproved(action);
    return true;
  };
  const discard = (dirty: boolean, action: () => void) => {
    if (dirty && !approvedDepth && !approvedClick && !confirm()) return false;
    runApproved(action);
    return true;
  };
  const beforeUnload = (event: BeforeUnloadEvent) => {
    // A confirmed full-page link must not trigger a second browser dialog.
    if (!drafts.size) return;
    if (approvedHref || approvedUnload) {
      approvedHref = null;
      approvedUnload = false;
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  };
  const click = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = (event.target as Element | null)?.closest?.('a[href]');
    if (
      !anchor ||
      anchor.hasAttribute('download') ||
      anchor.hasAttribute('data-preserve-draft')
    )
      return;
    const target = anchor.getAttribute('target');
    if (target && target !== '_self') return;
    const href = anchor.getAttribute('href');
    if (!href || !needsConfirmation(href)) return;
    if (!confirm()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    approvedClick = true;
    approvedHref = new URL(href, currentHref).href;
    // If another handler cancels the click, no departure was approved.
    queueMicrotask(() => {
      approvedClick = false;
      if (event.defaultPrevented) approvedHref = null;
    });
  };
  const popstate = (event: PopStateEvent) => {
    if (restoring) {
      restoring = false;
      event.stopImmediatePropagation();
      return;
    }
    const nextHref = browser.location.href;
    const nextIndex = event.state?.[historyKey] as number | undefined;
    if (needsConfirmation(nextHref) && !confirm()) {
      event.stopImmediatePropagation();
      restoring = true;
      // Entries created by this app have an index in both directions. An older
      // unmarked entry precedes the initial entry of this document.
      browser.history.go(
        nextIndex === undefined ? 1 : currentIndex - nextIndex,
      );
      return;
    }
    currentHref = nextHref;
    currentIndex = nextIndex ?? currentIndex - 1;
    approvedHref = null;
  };
  const writeHistory = (
    method: History['pushState'],
    state: unknown,
    unused: string,
    url: string | URL | null | undefined,
    index: number,
  ) => {
    const previous = historyWriteIndex;
    historyWriteIndex = index;
    try {
      method.call(browser.history, stamp(state, index), unused, url);
      currentIndex = index;
      currentHref = browser.location.href;
      approvedHref = null;
    } finally {
      historyWriteIndex = previous;
    }
  };
  const push: History['pushState'] = (state, unused, url) => {
    writeHistory(
      originalPush,
      state,
      unused,
      url,
      historyWriteIndex ?? currentIndex + 1,
    );
  };
  const replace: History['replaceState'] = (state, unused, url) => {
    writeHistory(
      originalReplace,
      state,
      unused,
      url,
      historyWriteIndex ?? currentIndex,
    );
  };
  browser.history.pushState = push;
  browser.history.replaceState = replace;
  browser.addEventListener('popstate', popstate, true);
  browser.addEventListener('pointerdown', rememberFocus, true);
  browser.addEventListener('keydown', rememberFocus, true);
  browser.document.addEventListener('click', click, true);

  const register = (options: DraftOptions = {}) => {
    const id = Symbol('draft');
    if (!drafts.size) browser.addEventListener('beforeunload', beforeUnload);
    drafts.set(id, options);
    return () => {
      drafts.delete(id);
      if (!drafts.size) {
        browser.removeEventListener('beforeunload', beforeUnload);
        approvedHref = null;
      }
    };
  };
  const dispose = () => {
    drafts.clear();
    previousFocus = null;
    if (browser.history.pushState === push)
      browser.history.pushState = originalPush;
    if (browser.history.replaceState === replace)
      browser.history.replaceState = originalReplace;
    browser.removeEventListener('popstate', popstate, true);
    browser.removeEventListener('pointerdown', rememberFocus, true);
    browser.removeEventListener('keydown', rememberFocus, true);
    browser.document.removeEventListener('click', click, true);
    browser.removeEventListener('beforeunload', beforeUnload);
  };
  const confirmAll = () => !drafts.size || confirm();
  const approveUnload = () => {
    approvedUnload = true;
    return () => {
      approvedUnload = false;
    };
  };
  return { register, navigate, discard, confirmAll, approveUnload, dispose };
};

let guard: ReturnType<typeof createUnsavedChangesGuard> | undefined;
export const getUnsavedChangesGuard = () => {
  guard ??= createUnsavedChangesGuard(window);
  return guard;
};

export const initializeUnsavedChangesGuard = () => {
  const current = getUnsavedChangesGuard();
  return () => {
    current.dispose();
    if (guard === current) guard = undefined;
  };
};

export const confirmUnsavedChanges = () =>
  typeof window === 'undefined' || getUnsavedChangesGuard().confirmAll();

/** Called only after a previously confirmed logout succeeds on the server. */
export const approveUnsavedUnload = () =>
  typeof window === 'undefined'
    ? () => {}
    : getUnsavedChangesGuard().approveUnload();
