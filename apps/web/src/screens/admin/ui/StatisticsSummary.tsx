import Link from 'next/link';
import {
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react';

import { pluralizeRu } from '@/shared/utils';
import { type AdminStats } from '@/entities/admin';
import { AdminPanel } from '@/features/admin';

import { adminNumber } from '../lib';

interface QueueLinkProps {
  href: string;
  title: string;
  value: number;
}
const QueueLink = ({ href, title, value }: QueueLinkProps) => {
  return (
    <Link
      href={href}
      className="flex min-w-0 items-center justify-between gap-4 rounded-md border bg-card px-4 py-3 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="text-sm">{title}</span>
      <span className="flex shrink-0 items-center gap-3 text-xl font-semibold tabular-nums">
        {adminNumber(value)}
        <ArrowUpRight size={16} className="text-muted-foreground" />
      </span>
    </Link>
  );
};
interface StatisticsSummaryProps {
  stats: AdminStats;
}
export const StatisticsSummary = ({ stats }: StatisticsSummaryProps) => {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Пользователи',
            value: stats.users.total,
            note: `${pluralizeRu(stats.users.candidates, ['кандидат', 'кандидата', 'кандидатов'])} · ${pluralizeRu(stats.users.employers, ['работодатель', 'работодателя', 'работодателей'])}`,
            href: '/admin/users',
            icon: Users,
          },
          {
            label: 'Компании',
            value: stats.companies.total,
            note: `${adminNumber(stats.companies.verified)} подтверждено`,
            href: '/admin/companies',
            icon: Building2,
          },
          {
            label: 'Активные потребности',
            value: stats.needs.active,
            note: `из ${pluralizeRu(stats.needs.total, ['потребности', 'потребностей', 'потребностей'])}`,
            href: '/admin/needs?status=active',
            icon: FileText,
          },
          {
            label: 'Попытки тестирования',
            value: stats.attempts.total,
            note: `Пройдено: ${adminNumber(stats.attempts.passed)}`,
            href: '/admin/attempts',
            icon: GraduationCap,
          },
        ].map(({ label, value, note, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="group min-w-0 rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
          >
            <AdminPanel className="h-full gap-3 transition-colors group-hover:border-primary/40">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Icon
                  size={18}
                  aria-hidden="true"
                  className="text-brand-text"
                />
              </div>
              <p className="text-3xl font-semibold tabular-nums sm:text-4xl">
                {adminNumber(value)}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {note}
              </p>
            </AdminPanel>
          </Link>
        ))}
      </div>
      <AdminPanel className="gap-4 border-primary/20 bg-accent/40">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-brand-text" />
          <h2 className="font-medium">Требуют внимания</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <QueueLink
            href="/admin/companies?status=pending"
            title="Компании на проверке"
            value={stats.companies.pending}
          />
          <QueueLink
            href="/admin/moderation"
            title="Новые навыки на модерации"
            value={stats.skills_pending}
          />
        </div>
      </AdminPanel>
    </>
  );
};
