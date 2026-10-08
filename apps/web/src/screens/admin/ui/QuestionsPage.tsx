'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';

import { Button, Card } from '@/shared/ui';
import { adminSchemas, kindLabels, queryString } from '@/entities/admin';
import {
  AdminSelect,
  ErrorNotice,
  Pagination,
  QuestionEditor,
  SkillPicker,
  Status,
  useAdminOptions,
  useAdminQuery,
} from '@/features/admin';

import { AdminPageHeader } from './AdminPageHeader';
import { QuestionDetails } from './QuestionDetails';

export const QuestionsPage = () => {
  const params = useSearchParams();
  const [filters, setFilters] = useState({
    skill_id: params.get('skill_id') ?? '',
    difficulty: params.get('difficulty') ?? '',
    active: params.get('active') ?? '',
    status: params.get('status') ?? '',
    kind: '',
  });
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const options = useAdminOptions();
  const list = useAdminQuery(
    `/assessments/questions?${queryString({ ...filters, limit: 20, offset })}`,
    adminSchemas.questions,
  );
  const filter = (key: keyof typeof filters, value: string) => {
    setFilters((v) => ({ ...v, [key]: value }));
    setOffset(0);
  };
  return (
    <div className="grid content-start gap-6">
      <AdminPageHeader
        title="Банк заданий"
        description="Задания и версии для автоматических тестов."
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            Добавить задание
          </Button>
        }
      />
      <Card className="gap-5 p-4 sm:p-6">
        <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SkillPicker
            label="Навык"
            value={filters.skill_id}
            onChange={(v) => filter('skill_id', v)}
            items={options.data.skills ?? []}
          />
          <AdminSelect
            showLabel
            label="Сложность"
            value={filters.difficulty}
            onChange={(v) => filter('difficulty', v)}
            options={[
              { value: '', label: 'Любая сложность' },
              ...[1, 2, 3, 4, 5].map((n) => ({
                value: String(n),
                label: `Сложность ${n}`,
              })),
            ]}
          />
          <AdminSelect
            showLabel
            label="Тип задания"
            value={filters.kind}
            onChange={(v) => filter('kind', v)}
            options={[
              { value: '', label: 'Любой тип' },
              ...Object.entries(kindLabels).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <AdminSelect
            showLabel
            label="Статус версии"
            value={filters.status}
            onChange={(v) => filter('status', v)}
            options={[
              { value: '', label: 'Все версии' },
              { value: 'draft', label: 'Есть черновик' },
              { value: 'published', label: 'Есть опубликованная' },
              { value: 'archived', label: 'Есть архивная' },
            ]}
          />
          <AdminSelect
            showLabel
            label="Активность задания"
            value={filters.active}
            onChange={(v) => filter('active', v)}
            options={[
              { value: '', label: 'Все задания' },
              { value: 'true', label: 'Активные' },
              { value: 'false', label: 'Архивные' },
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
                skill_id: '',
                difficulty: '',
                active: '',
                status: '',
                kind: '',
              });
              setOffset(0);
            }}
          >
            Сбросить фильтры
          </Button>
        )}
        <p className="text-xs text-caption">
          Статус относится к версиям: у одного задания могут быть и черновик, и
          опубликованная версия.
        </p>
        <ErrorNotice error={options.error} />
        <ErrorNotice error={list.error} />
        {list.loading && <p role="status">Загружаем задания…</p>}
        {!list.loading && !list.error && !list.data?.items.length && (
          <p className="py-8 text-center text-muted-foreground">
            Заданий не найдено
          </p>
        )}
        <div className="divide-y border-t">
          {list.data?.items.map((question) => (
            <div
              key={question.id}
              className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{question.skill_name}</span>
                  <Status value={question.active ? 'active' : 'archived'} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {kindLabels[question.kind]} · Сложность {question.difficulty}{' '}
                  · Последняя v{question.latest_version} · Опубликована:{' '}
                  {question.published_version
                    ? `v${question.published_version}`
                    : 'нет'}
                </p>
                <p className="mt-1 text-xs text-caption">{question.id}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setSelected(question.id)}
              >
                Открыть
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
        <QuestionEditor
          onClose={() => setCreating(false)}
          onSaved={list.reload}
        />
      )}
      {selected && (
        <QuestionDetails
          id={selected}
          onClose={() => setSelected(null)}
          onSaved={list.reload}
        />
      )}
    </div>
  );
};
