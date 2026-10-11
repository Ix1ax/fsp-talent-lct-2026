import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { Button, Card, Skeleton } from '@/shared/ui';
import {
  AdminPanel,
  ErrorNotice,
  operationConfig,
  type OperationSection,
} from '@/features/admin';

interface OperationDetailsLayoutProps {
  section: OperationSection;
  title?: string;
  loading: boolean;
  hasData: boolean;
  error: unknown;
  onReload: () => void;
  children: ReactNode;
}
export const OperationDetailsLayout = ({
  section,
  title,
  loading,
  hasData,
  error,
  onReload,
  children,
}: OperationDetailsLayoutProps) => {
  return (
    <div className="grid min-w-0 gap-6">
      <nav
        aria-label="Хлебные крошки"
        className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
      >
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center hover:text-foreground"
        >
          Админка
        </Link>
        <ChevronRight size={14} />
        <Link
          href={`/admin/${section}`}
          className="inline-flex min-h-11 items-center hover:text-foreground"
        >
          {operationConfig[section].title}
        </Link>
        <ChevronRight size={14} />
        <span aria-current="page" className="text-foreground">
          Карточка
        </span>
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="min-w-0 text-2xl font-semibold wrap-anywhere sm:text-3xl">
          {title ?? 'Карточка'}
        </h1>
        <Button variant="outline" disabled={loading} onClick={onReload}>
          Обновить
        </Button>
      </div>
      <ErrorNotice error={error} onRetry={onReload} />
      {loading && !hasData && (
        <Card
          role="status"
          aria-label="Загружаем карточку"
          className="gap-5 p-5 sm:p-8"
        >
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </Card>
      )}
      {hasData && (
        <div
          aria-busy={loading}
          className={
            loading ? 'pointer-events-none grid gap-6 opacity-60' : 'grid gap-6'
          }
        >
          {children}
        </div>
      )}
    </div>
  );
};
interface DetailFieldsProps {
  fields: { label: string; value: ReactNode }[];
}
export const DetailFields = ({ fields }: DetailFieldsProps) => {
  return (
    <dl className="grid min-w-0 gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
      {fields.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1.5 text-sm wrap-anywhere">
            {value ?? 'Не указано'}
          </dd>
        </div>
      ))}
    </dl>
  );
};
interface DescriptionPanelProps {
  text: string | null;
}

export const DescriptionPanel = ({ text }: DescriptionPanelProps) => {
  return text ? (
    <AdminPanel>
      <h2 className="font-medium">Описание</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </AdminPanel>
  ) : null;
};
interface AdminEntityLinkProps {
  section: OperationSection;
  id: string;
  label?: string;
}

export const AdminEntityLink = ({
  section,
  id,
  label,
}: AdminEntityLinkProps) => {
  return (
    <Link
      href={`/admin/${section}/${id}`}
      className="text-brand-text underline-offset-4 hover:underline"
    >
      {label ?? id}
    </Link>
  );
};
