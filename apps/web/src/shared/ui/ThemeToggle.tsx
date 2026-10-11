'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from 'lucide-react';

import { Button } from './Button';
import { headerNavItemClassName } from './HeaderBar';

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const useThemeSwitch = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const ready = hydrated && resolvedTheme !== undefined;
  const dark = ready && (resolvedTheme ?? theme) === 'dark';

  return {
    dark,
    ready,
    toggle: () => setTheme(dark ? 'light' : 'dark'),
  };
};

export const ThemeToggle = () => {
  const { dark, ready, toggle } = useThemeSwitch();
  const label = dark ? 'Включить светлую тему' : 'Включить тёмную тему';

  return (
    <Button
      type="button"
      size="icon"
      className="size-10"
      variant="ghost"
      aria-label={ready ? label : 'Сменить тему'}
      title={ready ? label : 'Сменить тему'}
      onClick={toggle}
    >
      {ready &&
        (dark ? (
          <SunIcon aria-hidden="true" />
        ) : (
          <MoonIcon aria-hidden="true" />
        ))}
    </Button>
  );
};

/** Строка смены темы для меню-бургера. */
export const ThemeMenuItem = () => {
  const { dark, ready, toggle } = useThemeSwitch();
  const themeLabel = dark ? 'Светлая тема' : 'Тёмная тема';
  return (
    <button type="button" className={headerNavItemClassName} onClick={toggle}>
      {ready &&
        (dark ? (
          <SunIcon aria-hidden="true" />
        ) : (
          <MoonIcon aria-hidden="true" />
        ))}
      {ready ? themeLabel : 'Сменить тему'}
    </button>
  );
};
