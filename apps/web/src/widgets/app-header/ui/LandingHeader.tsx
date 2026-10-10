import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { STATIC_ROUTES } from '@/shared/contants';
import { ThemeToggle } from '@/shared/ui';

interface LandingHeaderProps {
  account: ReactNode;
  notifications: ReactNode;
}

const LINKS = [
  { href: '#manifest', label: 'О платформе' },
  { href: '#employer-title', label: 'Работодателям' },
  { href: '#faq-title', label: 'Вопросы' },
];

export const LandingHeader = ({
  account,
  notifications,
}: LandingHeaderProps) => (
  <header
    data-landing-header
    className="absolute inset-x-0 top-0 z-40 bg-[#1b1c21]/90 text-[#efefef]"
  >
    <div className="container-page">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 border-b border-white/20 py-5 lg:grid-cols-[1fr_auto_1fr] lg:py-7">
        <Link
          href={STATIC_ROUTES.HOME}
          aria-label="ФСП Скаут — главная"
          className="flex min-h-11 w-fit items-center gap-6 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <Image
            src="/brand/scout-horizontal-on-dark.svg"
            alt="ФСП Скаут"
            width={164}
            height={33}
            priority
            className="h-auto w-[132px] sm:w-[164px]"
          />
          <span className="hidden border-l border-white/25 pl-6 text-[10px] leading-relaxed tracking-[0.12em] xl:block">
            ТВОЙ ОПЫТ.
            <br />
            ТВОЯ КАРЬЕРА.
          </span>
        </Link>
        <nav
          aria-label="Разделы лендинга"
          className="order-last col-span-2 flex items-center justify-between gap-3 pt-3 lg:order-none lg:col-span-1 lg:gap-7 lg:pt-0"
        >
          {LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center border-b border-transparent text-xs text-white/85 transition-colors hover:border-white/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-sm motion-reduce:transition-none"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-2 [&_button]:border-white/25 [&_button]:bg-transparent [&_button]:text-white [&_button:hover]:bg-white/10 [&_button:focus-visible]:outline-white">
          {notifications}
          <ThemeToggle />
          {account}
        </div>
      </div>
    </div>
  </header>
);
