'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { Button, Card } from '@/shared/ui';
import { adminSchemas, queryString } from '@/entities/admin';
import {
  AdminSelect,
  ErrorNotice,
  Pagination,
  SkillPicker,
  Status,
  TemplateEditor,
  useAdminOptions,
  useAdminQuery,
} from '@/features/admin';

import { AdminPageHeader } from './AdminPageHeader';
import { TemplateDetails } from './TemplateDetails';

export const TemplatesPage = () => {
  const [filters, setFilters] = useState({
    stack_skill_id: '',
    specialization_id: '',
    grade_id: '',
    status: '',
  });
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
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
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Добавить шаблон
          </Button>
        }
      />
      <Card className="gap-5 p-4 sm:p-6">
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
        {Object.values(filters).some(Boolean) && (
          <Button
            className="justify-self-end"
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
        )}
        <ErrorNotice error={options.error} />
        <ErrorNotice error={list.error} />
        {list.loading && <p role="status">Загружаем шаблоны…</p>}
        {!list.loading && !list.error && !list.data?.items.length && (
          <p className="py-8 text-center text-muted-foreground">
            Шаблонов не найдено
          </p>
        )}
        <div className="divide-y border-t">
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
              <Button
                variant="outline"
                onClick={() => setSelected(template.id)}
              >
                Открыть состав
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
      {creating && (
        <TemplateEditor
          onClose={() => setCreating(false)}
          onSaved={list.reload}
        />
      )}
      {selected && (
        <TemplateDetails
          id={selected}
          onClose={() => setSelected(null)}
          onSaved={list.reload}
        />
      )}
    </div>
  );
};
