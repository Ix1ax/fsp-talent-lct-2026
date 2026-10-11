'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';

import { DYNAMIC_ROUTES } from '@/shared/contants';
import { Button } from '@/shared/ui';

const STORAGE_KEY = 'fsp-cookie-notice';
// Сейчас сервис ставит только обязательные cookie (сессия, безопасность, тема).
// При подключении аналитики добавить выбор «Принять все / Только обязательные».
const NOTICE_VERSION = '1';

const CHANGE_EVENT = 'fsp-cookie-notice-change';
let hiddenForSession = false;

const readAcknowledged = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === NOTICE_VERSION;
  } catch {
    return false;
  }
};

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};

const acknowledge = () => {
  try {
    window.localStorage.setItem(STORAGE_KEY, NOTICE_VERSION);
  } catch {
    // Хранилище недоступно — уведомление скроется до перезагрузки страницы.
    hiddenForSession = true;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const CookieNotice = () => {
  const acknowledged = useSyncExternalStore(
    subscribe,
    () => hiddenForSession || readAcknowledged(),
    () => true,
  );

  if (acknowledged) return null;

  return (
    <section
      role="region"
      aria-label="Использование cookie"
      // Отступ под нижнюю или боковую панель — только если она есть на странице (globals.css).
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom)+var(--fixed-bottom-bar,0px))] z-50 flex flex-col gap-3 rounded-2xl border border-border bg-popover p-5 text-popover-foreground shadow-popover sm:inset-x-auto sm:left-[calc(1.5rem+var(--fixed-left-bar,0px))] sm:max-w-110"
    >
      <p className="text-base font-semibold">Мы используем cookie</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Только обязательные — для входа, безопасности и сохранения темы.
        Подробнее — в{' '}
        <Link
          href={DYNAMIC_ROUTES.LEGAL('cookies')}
          className="text-brand-text underline underline-offset-4"
        >
          политике cookie
        </Link>
        .
      </p>
      <div className="flex justify-end">
        <Button size="sm" onClick={acknowledge}>
          Понятно
        </Button>
      </div>
    </section>
  );
};
