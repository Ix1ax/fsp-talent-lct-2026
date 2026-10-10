import Link from 'next/link';

import {
  DYNAMIC_ROUTES,
  LEGAL_DOCUMENTS,
  LEGAL_OPERATOR_PLACEHOLDER,
  STATIC_ROUTES,
} from '@/shared/contants';
import { BrandLogo } from '@/shared/ui';

const linkClassName =
  'text-sm text-foreground underline-offset-4 hover:underline focus-visible:underline';
// Заголовки колонок — тот же стиль, что у подзаголовков в кабинетах.
const headingClassName = 'text-sm font-semibold text-foreground';

export const SiteFooter = () => (
  <footer className="container-page mt-auto pb-3">
    <div className="flex flex-col gap-8 rounded-2xl border border-border/60 bg-card px-5 pt-8 pb-6 sm:px-8 sm:pt-10 sm:pb-8">
      <div className="flex flex-wrap gap-x-12 gap-y-8">
        <div className="flex max-w-90 flex-[1_1_280px] flex-col gap-3">
          <Link
            href={STATIC_ROUTES.HOME}
            className="self-start"
            aria-label="ФСП Скаут — главная"
          >
            <BrandLogo />
          </Link>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Подбор IT-специалистов по навыкам и условиям работы. Профили
            кандидатов анонимны до принятия приглашения.
          </p>
        </div>
        <nav
          aria-label="Сервис"
          className="flex flex-[0_1_180px] flex-col gap-2.5"
        >
          <span className={headingClassName}>Сервис</span>
          <Link href={STATIC_ROUTES.CANDIDATE} className={linkClassName}>
            Кандидатам
          </Link>
          <Link href={STATIC_ROUTES.EMPLOYER} className={linkClassName}>
            Работодателям
          </Link>
          <Link href={STATIC_ROUTES.GUIDES} className={linkClassName}>
            Справочник
          </Link>
        </nav>
        <nav
          aria-label="Документы"
          className="flex flex-[1_1_300px] flex-col gap-2.5"
        >
          <span className={headingClassName}>Документы</span>
          {LEGAL_DOCUMENTS.map((doc) => (
            <Link
              key={doc.slug}
              href={DYNAMIC_ROUTES.LEGAL(doc.slug)}
              className={linkClassName}
            >
              {doc.title}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex flex-wrap justify-between gap-4 border-t border-border pt-5 text-[0.8125rem] text-caption">
        <span>
          © {new Date().getFullYear()} ФСП Скаут. {LEGAL_OPERATOR_PLACEHOLDER}.
        </span>
        <Link
          href={DYNAMIC_ROUTES.LEGAL('cookies')}
          className="underline-offset-4 hover:underline"
        >
          Использование cookie
        </Link>
      </div>
    </div>
  </footer>
);
