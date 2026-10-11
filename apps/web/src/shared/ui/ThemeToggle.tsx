'use client';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from 'lucide-react';

import { Button } from './Button';
import { headerNavItemClassName } from './HeaderBar';

const useThemeSwitch = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const dark = (resolvedTheme ?? theme) === 'dark';

  return {
    dark,
    ready: resolvedTheme !== undefined,
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
  const { dark, toggle } = useThemeSwitch();
  return (
    <button type="button" className={headerNavItemClassName} onClick={toggle}>
      {dark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
      {dark ? 'Светлая тема' : 'Тёмная тема'}
    </button>
  );
};
