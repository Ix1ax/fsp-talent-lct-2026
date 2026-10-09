'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { Button, Card, StaggerItem } from '@/shared/ui';
import { adminSchemas, queryString } from '@/entities/admin';
import {
  AdminAnimatedList,
  AdminListLoading,
  AdminListViewport,
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
    options.data[kind]?.find((s) => s.id === String(id))?.name ??
    'Значение не найдено';
  return (
    <div className="grid min-w-0 content-start gap-6">
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
      <Card className="relative min-w-0 gap-4 p-4 sm:p-6">
        <details className="rounded-md border border-border p-4">
          <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">
            Фильтры
            {Object.values(filters).some(Boolean)
              ? ` · выбрано ${Object.values(filters).filter(Boolean).length}`
              : ' · все записи'}
          </summary>
          <div className="mt-4 grid gap-3">
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
                    filters[
                      kind === 'grades' ? 'grade_id' : 'specialization_id'
                    ]
                  }
                  onChange={(v) =>
                    filter(
                      kind === 'grades' ? 'grade_id' : 'specialization_id',
                      v,
                    )
                  }
                  options={[
                    {
                      value: '',
                      label:
                        kind === 'grades' ? 'Все грейды' : 'Все специализации',
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
            <div className="flex min-h-11 justify-end">
              <Button
                disabled={!Object.values(filters).some(Boolean)}
                size="sm"
                className="min-h-11"
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
          </div>
        </details>
        <ErrorNotice error={options.error} onRetry={options.reload} />
        <ErrorNotice error={list.error} onRetry={list.reload} />
        <p role="status" aria-live="polite" className="sr-only">
          {list.loading ? 'Загружаем шаблоны…' : ''}
        </p>
        <AdminListViewport loading={list.loading} className="border-t">
          <AdminListLoading loading={list.loading} hasData={!!list.data} />
          {!list.loading && !list.error && !list.data?.items.length && (
            <p className="py-6 text-center text-muted-foreground">
              Шаблонов не найдено
            </p>
          )}
          <AdminAnimatedList>
            {list.data?.items.map((template) => (
              <StaggerItem
                key={template.id}
                className="grid min-w-0 gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 wrap-anywhere">
                  <div className="min-w-0">
                    <span className="font-medium">
                      {template.stack_name ?? 'Стек не задан'} · v
                      {template.version}
                    </span>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {label('specializations', template.specialization_id)} ·{' '}
                      {label('grades', template.grade_id)} ·{' '}
                      {template.time_limit_sec / 60} мин · {template.pass_score}
                      %
                    </p>
                  </div>
                  <Status value={template.status} />
                </div>
                <Button variant="outline" asChild>
                  <Link href={`/admin/templates/${template.id}`}>
                    {' '}
                    Открыть состав
                  </Link>
                </Button>
              </StaggerItem>
            ))}
          </AdminAnimatedList>
        </AdminListViewport>
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
