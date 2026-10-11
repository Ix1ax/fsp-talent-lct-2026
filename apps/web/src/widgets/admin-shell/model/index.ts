import { useSyncExternalStore } from 'react';

export { ADMIN_LINKS } from './adminLinks';

const key = 'fsp.admin.sidebar';
const changed = 'fsp:admin-sidebar';
const subscribe = (notify: () => void) => {
  window.addEventListener('storage', notify);
  window.addEventListener(changed, notify);
  return () => {
    window.removeEventListener('storage', notify);
    window.removeEventListener(changed, notify);
  };
};
const read = () => localStorage.getItem(key) === 'collapsed';
const server = () => false;
export const useSidebarCollapsed = () => {
  const collapsed = useSyncExternalStore(subscribe, read, server);
  const toggle = () => {
    localStorage.setItem(key, collapsed ? 'expanded' : 'collapsed');
    window.dispatchEvent(new Event(changed));
  };
  return { collapsed, toggle };
};
