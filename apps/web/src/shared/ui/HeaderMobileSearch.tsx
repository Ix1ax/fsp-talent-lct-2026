'use client';

import { type ReactNode, useState } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';

import { Button } from './Button';

interface HeaderMobileSearchProps {
  children: ReactNode;
}

/** На телефоне поиск свёрнут в иконку и раскрывается строкой под шапкой. */
export const HeaderMobileSearch = ({ children }: HeaderMobileSearchProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="md:hidden"
        aria-label={open ? 'Скрыть поиск' : 'Поиск'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <XIcon /> : <SearchIcon />}
      </Button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-border bg-card px-4 py-3 md:hidden">
          {children}
        </div>
      )}
    </>
  );
};
