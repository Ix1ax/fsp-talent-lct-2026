import {
  ArrowRightIcon,
  Building2Icon,
  MailIcon,
  PlusIcon,
} from 'lucide-react';

import { Badge, Button } from '@/shared/ui';
import type { Company } from '@/entities/company';
import { MEMBER_ROLE_LABELS, VERIFICATION_LABELS } from '@/entities/company';

import type { EmployerSection } from '../constants/sections';

interface EmployerOverviewProps {
  companies: Company[];
  busy: boolean;
  onOpenCompany: (companyId: string, section: EmployerSection) => void;
  onCreateCompany: () => void;
  onInvitation: () => void;
}
export const EmployerOverview = ({
  companies,
  busy,
  onOpenCompany,
  onCreateCompany,
  onInvitation,
}: EmployerOverviewProps) => (
  <div className="grid min-w-0 gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Компаний в кабинете: {companies.length}
      </p>
      <Button size="lg" disabled={busy} onClick={onCreateCompany}>
        <PlusIcon /> Создать компанию
      </Button>
    </div>
    <section
      aria-label="Ваши компании"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {companies.map((company) => (
        <article
          key={company.id}
          className="flex min-w-0 flex-col gap-5 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/35 sm:p-6"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-semibold text-muted-foreground"
            >
              {company.name.trim().slice(0, 1).toLocaleUpperCase('ru') || (
                <Building2Icon className="size-5" />
              )}
            </span>
            <div className="grid min-w-0 flex-1 gap-1.5">
              <h2 className="text-lg font-semibold leading-snug [overflow-wrap:anywhere]">
                {company.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {MEMBER_ROLE_LABELS[company.memberRole]}
              </p>
            </div>
          </div>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {company.description ||
              'Добавьте описание компании, чтобы рассказать о команде и её задачах.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                company.verificationStatus === 'verified'
                  ? 'success'
                  : 'secondary'
              }
              className="h-auto rounded-md py-1"
            >
              {VERIFICATION_LABELS[company.verificationStatus] ??
                'Не проверена'}
            </Badge>
            {company.inn && (
              <span className="text-xs text-muted-foreground">
                ИНН {company.inn}
              </span>
            )}
          </div>
          <div className="mt-auto grid gap-3 border-t pt-4">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => onOpenCompany(company.id, 'candidates')}
              className="justify-between"
            >
              Банк соискателей <ArrowRightIcon />
            </Button>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Button
                variant="link"
                disabled={busy}
                onClick={() => onOpenCompany(company.id, 'profile')}
                className="h-auto p-0 text-sm text-brand-text"
              >
                Профиль
              </Button>
              <Button
                variant="link"
                disabled={busy}
                onClick={() => onOpenCompany(company.id, 'team')}
                className="h-auto p-0 text-sm text-brand-text"
              >
                Сотрудники
              </Button>
              <Button
                variant="link"
                disabled={busy}
                onClick={() => onOpenCompany(company.id, 'documents')}
                className="h-auto p-0 text-sm text-brand-text"
              >
                Документы
              </Button>
              <Button
                variant="link"
                disabled={busy}
                onClick={() => onOpenCompany(company.id, 'vacancies')}
                className="h-auto p-0 text-sm text-brand-text"
              >
                Потребности
              </Button>
            </div>
          </div>
        </article>
      ))}
      <button
        type="button"
        disabled={busy}
        onClick={onCreateCompany}
        className="group flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/40 p-6 text-center transition-colors hover:border-primary/40 hover:bg-card focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
      >
        <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:text-brand-text">
          <PlusIcon className="size-5" />
        </span>
        <span className="font-semibold">Добавить компанию</span>
        <span className="max-w-60 text-sm leading-relaxed text-muted-foreground">
          Отдельный профиль, команда и потребности для каждой компании.
        </span>
      </button>
    </section>
    <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-start gap-3">
        <MailIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="grid gap-1">
          <h2 className="font-semibold">Вас пригласили в команду?</h2>
          <p className="text-sm text-muted-foreground">
            Примите приглашение, чтобы компания появилась в вашем кабинете.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        disabled={busy}
        onClick={onInvitation}
        className="w-full sm:w-auto"
      >
        Принять приглашение <ArrowRightIcon />
      </Button>
    </div>
  </div>
);
