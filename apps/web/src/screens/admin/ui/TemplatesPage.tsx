'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button, Card } from '@/shared/ui';
import { adminSchemas, queryString } from '@/entities/admin';
import {
  AdminListLoading,
  AdminSelect,
  ErrorNotice,
  Pagination,
  SkillPicker,
  Status,
  useAdminOptions,
  useAdminQuery,
} from '@/features/admin';

import { AdminPageHeader } from './AdminPageHeader';

export const TemplatesPage = () => {
  const [filters, setFilters] = useState({
    stack_skill_id: '',
    specialization_id: '',
    grade_id: '',
    status: '',
  });
  const [offset, setOffset] = useState(0);
  const options = useAdminOptions();
  const list = useAdminQuery(
    `/assessments/templates?${queryString({ ...filters, limit: 20, offset })}`,
    adminSchemas.templates,
  );
  const filter = (key: keyof typeof filters, value: string) => {
    setFilters((v) => ({ ...v, [key]: value }));
    setOffset(0);
  };
  const label = (kind: string, id: number) =>
    options.data[kind]?.find((s) => s.id === String(id))?.name ?? `ID ${id}`;
  return (
    <div className="grid content-start gap-6">
      <AdminPageHeader
        title="Шаблоны тестов"
        description="Стек, специализация, грейд и состав заданий."
        action={
          <Button asChild>
            <Link href="/admin/templates/new">
              <Plus />
              Добавить шаблон
            </Link>
          </Button>
        }
      />
      <Card className="relative gap-4 p-4 sm:p-6">
        <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SkillPicker
            label="Основной навык"
            value={filters.stack_skill_id}
            onChange={(v) => filter('stack_skill_id', v)}
            items={options.data.skills ?? []}
          />
          {(['specializations', 'grades'] as const).map((kind) => (
            <AdminSelect
              showLabel
              key={kind}
              label={kind === 'grades' ? 'Грейд' : 'Специализация'}
              value={
                filters[kind === 'grades' ? 'grade_id' : 'specialization_id']
              }
              onChange={(v) =>
                filter(kind === 'grades' ? 'grade_id' : 'specialization_id', v)
              }
              options={[
                {
                  value: '',
                  label: kind === 'grades' ? 'Все грейды' : 'Все специализации',
                },
                ...(options.data[kind] ?? []).map((s) => ({
                  value: s.id,
                  label: s.name,
                })),
              ]}
            />
          ))}
          <AdminSelect
            showLabel
            label="Статус"
            value={filters.status}
            onChange={(v) => filter('status', v)}
            options={[
              { value: '', label: 'Все статусы' },
              { value: 'draft', label: 'Черновики' },
              { value: 'published', label: 'Опубликованные' },
              { value: 'archived', label: 'Архивные' },
            ]}
          />
        </div>
        <div className="flex h-9 justify-end">
          <Button
            disabled={!Object.values(filters).some(Boolean)}
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilters({
                stack_skill_id: '',
                specialization_id: '',
                grade_id: '',
                status: '',
              });
              setOffset(0);
            }}
          >
            Сбросить фильтры
          </Button>
        </div>
        <ErrorNotice error={options.error} />
        <ErrorNotice error={list.error} />
        <p role="status" aria-live="polite" className="sr-only">
          {list.loading ? 'Загружаем шаблоны…' : ''}
        </p>
        <div className="divide-y border-t">
          <AdminListLoading loading={list.loading} hasData={!!list.data} />
          {!list.loading && !list.error && !list.data?.items.length && (
            <p className="py-6 text-center text-muted-foreground">
              Шаблонов не найдено
            </p>
          )}
          {list.data?.items.map((template) => (
            <div
              key={template.id}
              className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {template.stack_name ?? 'Стек не задан'} · v
                    {template.version}
                  </span>
                  <Status value={template.status} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {label('specializations', template.specialization_id)} ·{' '}
                  {label('grades', template.grade_id)} ·{' '}
                  {template.time_limit_sec / 60} мин · {template.pass_score}%
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href={`/admin/templates/${template.id}`}>
                  {' '}
                  Открыть состав
                </Link>
              </Button>
            </div>
          ))}
        </div>
        <Pagination
          offset={offset}
          count={list.data?.items.length ?? 0}
          total={list.data?.total}
          loading={list.loading}
          onChange={setOffset}
        />
      </Card>
    </div>
  );
};
