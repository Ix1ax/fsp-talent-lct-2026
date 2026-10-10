import {
  CalendarDaysIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GlobeIcon,
  MailIcon,
  UsersIcon,
} from 'lucide-react';

import { Badge, Button } from '@/shared/ui';
import { contactUrlSchema } from '@/shared/validation/contactUrl';
import type { Company } from '@/entities/company';
import { MEMBER_ROLE_LABELS, VERIFICATION_LABELS } from '@/entities/company';
import { CompanyLogo } from '@/features/company';

import type { EmployerGateway } from '../lib/gateway';

interface CompanyProfileSummaryProps {
  company: Company;
  api: EmployerGateway;
  busy: boolean;
  onTeam: () => void;
  onDocuments: () => void;
}
export const CompanyProfileSummary = ({
  company,
  api,
  busy,
  onTeam,
  onDocuments,
}: CompanyProfileSummaryProps) => {
  const parsedUrl = contactUrlSchema.safeParse(company.contactUrl);
  const website =
    parsedUrl.success && parsedUrl.data ? new URL(parsedUrl.data) : null;
  const createdAt = new Date(company.createdAt);
  return (
    <aside
      aria-label="Сведения о компании"
      className="grid min-w-0 gap-6 rounded-2xl border border-border/60 bg-card p-5 sm:p-6 md:sticky md:top-40 lg:top-24"
    >
      <div className="flex min-w-0 items-start gap-3">
        <CompanyLogo company={company} api={api} />
        <div className="grid min-w-0 gap-2">
          <h2 className="text-lg font-semibold leading-snug [overflow-wrap:anywhere]">
            {company.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {MEMBER_ROLE_LABELS[company.memberRole]}
          </p>
        </div>
      </div>
      <div className="grid gap-2 rounded-xl bg-muted/50 p-4">
        <p className="text-xs text-muted-foreground">Проверка компании</p>
        <Badge
          variant={
            company.verificationStatus === 'verified' ? 'success' : 'secondary'
          }
          className="h-auto max-w-full justify-self-start whitespace-normal rounded-md py-1"
        >
          {VERIFICATION_LABELS[company.verificationStatus] ??
            'Статус не указан'}
        </Badge>
      </div>
      <div className="grid gap-4 text-sm">
        <div className="flex min-w-0 items-start gap-3">
          <MailIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <div className="grid min-w-0 gap-1">
            <p className="text-xs text-muted-foreground">Контактный email</p>
            <a
              href={`mailto:${company.contactEmail}`}
              className="text-brand-text hover:underline [overflow-wrap:anywhere]"
            >
              {company.contactEmail}
            </a>
          </div>
        </div>
        <div className="flex min-w-0 items-start gap-3">
          <GlobeIcon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          />
          <div className="grid min-w-0 gap-1">
            <p className="text-xs text-muted-foreground">Сайт и контакты</p>
            {website ? (
              <a
                href={website.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-1.5 text-brand-text hover:underline"
              >
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {website.host}
                  {website.pathname === '/' ? '' : website.pathname}
                </span>
                <ExternalLinkIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0"
                />
              </a>
            ) : (
              <span className="text-muted-foreground">Не указан</span>
            )}
          </div>
        </div>
        <dl className="grid gap-4 border-t pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">ИНН</dt>
            <dd className="[overflow-wrap:anywhere]">
              {company.inn || 'Не указан'}
            </dd>
          </div>
          {!Number.isNaN(createdAt.getTime()) && (
            <div className="flex items-start gap-3">
              <CalendarDaysIcon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              />
              <div className="grid gap-1">
                <dt className="text-xs text-muted-foreground">В системе с</dt>
                <dd>
                  {createdAt.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            </div>
          )}
        </dl>
      </div>
      <div className="grid gap-2 border-t pt-4">
        <Button
          variant="outline"
          disabled={busy}
          onClick={onTeam}
          className="justify-start"
        >
          <UsersIcon />
          Сотрудники компании
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={onDocuments}
          className="justify-start"
        >
          <FileTextIcon />
          Документы и логотип
        </Button>
      </div>
    </aside>
  );
};
