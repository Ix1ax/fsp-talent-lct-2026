'use client';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from 'lucide-react';

import { Button } from './Button';
import { headerNavItemClassName } from './HeaderBar';

const useThemeSwitch = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const dark = (resolvedTheme ?? theme) === 'dark';
  return { dark, toggle: () => setTheme(dark ? 'light' : 'dark') };
};

export const ThemeToggle = () => {
  const { toggle } = useThemeSwitch();
  return (
    <Button
      type="button"
      size="icon"
      className="size-10"
      variant="outline"
      aria-label="Сменить тему"
      title="Сменить тему"
      onClick={toggle}
    >
      {/* Иконка — тема, на которую переключит кнопка. CSS, чтобы не было
          расхождения с серверной разметкой до определения темы. */}
      <MoonIcon className="dark:hidden" />
      <SunIcon className="hidden dark:block" />
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
