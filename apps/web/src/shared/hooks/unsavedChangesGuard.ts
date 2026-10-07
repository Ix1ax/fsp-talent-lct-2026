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

export const createUnsavedChangesGuard = (browser: Window) => {
  const drafts = new Set<symbol>();
  let navigationApprovedUntil = 0;
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!drafts.size || Date.now() < navigationApprovedUntil) return;
    event.preventDefault();
    event.returnValue = '';
  };
  const click = (event: MouseEvent) => {
    if (
      !drafts.size ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const anchor = (event.target as Element | null)?.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return;
    const target = anchor.getAttribute('target');
    if (target && target !== '_self') return;
    const href = anchor.getAttribute('href');
    if (!href || !leavesCurrentPage(href, browser.location.href)) return;
    if (browser.confirm('Есть несохранённые изменения. Покинуть страницу?')) {
      navigationApprovedUntil = Date.now() + 2000;
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };
  const register = () => {
    const id = Symbol('draft');
    if (!drafts.size) {
      browser.addEventListener('beforeunload', beforeUnload);
      browser.document.addEventListener('click', click, true);
    }
    drafts.add(id);
    return () => {
      drafts.delete(id);
      if (drafts.size) return;
      browser.removeEventListener('beforeunload', beforeUnload);
      browser.document.removeEventListener('click', click, true);
    };
  };
  return { register };
};
