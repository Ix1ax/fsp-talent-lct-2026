import Link from 'next/link';
import {
  BriefcaseBusinessIcon,
  Building2Icon,
  FileTextIcon,
  MailIcon,
  SearchIcon,
  UsersIcon,
} from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { OptionSelect } from '@/shared/ui';

import { EMPLOYER_SECTIONS, type EmployerSection } from '../constants/sections';

// Вкладки настроек компании. Потребности, банк и предложения — в шапке.
const COMPANY_TABS = EMPLOYER_SECTIONS.filter((item) =>
  ['profile', 'documents', 'team'].includes(item.id),
);

const ICONS = {
  profile: Building2Icon,
  documents: FileTextIcon,
  team: UsersIcon,
  vacancies: BriefcaseBusinessIcon,
  candidates: SearchIcon,
  offers: MailIcon,
};
const LABELS = {
  profile: 'Профиль',
  documents: 'Документы',
  team: 'Сотрудники',
  vacancies: 'Потребности',
  candidates: 'Соискатели',
  offers: 'Предложения',
};
interface EmployerNavigationProps {
  section: EmployerSection;
  busy: boolean;
  href: (section: EmployerSection) => string;
  onNavigate: (section: EmployerSection) => void;
}
export const EmployerNavigation = ({
  section,
  busy,
  href,
  onNavigate,
}: EmployerNavigationProps) => (
  <div className="min-w-0">
    <OptionSelect
      aria-label="Разделы кабинета работодателя"
      value={section}
      disabled={busy}
      className="h-12 rounded-xl bg-card data-[size=default]:h-12 lg:hidden"
      onValueChange={(value) => onNavigate(value as EmployerSection)}
      options={COMPANY_TABS.map((item) => ({
        value: item.id,
        label: LABELS[item.id],
      }))}
    />
    <nav
      aria-label="Разделы кабинета работодателя"
      className="hidden min-w-0 gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card p-1.5 lg:flex"
    >
      {COMPANY_TABS.map((item) => {
        const Icon = ICONS[item.id];
        return (
          <Link
            data-preserve-draft
            key={item.id}
            href={href(item.id)}
            scroll={false}
            onNavigate={(e) => {
              e.preventDefault();
              onNavigate(item.id);
            }}
            onClick={(e) => {
              if (busy) e.preventDefault();
            }}
            aria-current={section === item.id ? 'page' : undefined}
            aria-disabled={busy || undefined}
            tabIndex={busy ? -1 : undefined}
            className={cn(
              'flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
              section === item.id
                ? 'bg-accent text-brand-text'
                : 'text-muted-foreground',
              busy && 'pointer-events-none opacity-60',
            )}
          >
            <Icon className="size-4" aria-hidden="true" /> {LABELS[item.id]}
          </Link>
        );
      })}
    </nav>
  </div>
);
