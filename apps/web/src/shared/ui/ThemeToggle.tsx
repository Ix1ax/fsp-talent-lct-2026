'use client';
import { useTheme } from 'next-themes';
import { SunMoonIcon } from 'lucide-react';

import { Button } from './Button';
export const ThemeToggle = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      type="button"
      size="icon"
      className="size-10"
      variant="outline"
      aria-label="Сменить тему"
      title="Сменить тему"
      onClick={() =>
        setTheme((resolvedTheme ?? theme) === 'dark' ? 'light' : 'dark')
      }
    >
      <SunMoonIcon />
    </Button>
  );
};
