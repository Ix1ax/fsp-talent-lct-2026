'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Button, Card, StaggerItem } from '@/shared/ui';
import { adminSchemas, type CatalogItem } from '@/entities/admin';
import {
  AdminAnimatedList,
  AdminListLoading,
  ErrorNotice,
  ModerationEditor,
  Pagination,
  SkillPicker,
  Status,
  useAdminOptions,
  useAdminQuery,
} from '@/features/admin';

import { AdminPageHeader } from './AdminPageHeader';

export const ModerationPage = () => {
  const params = useSearchParams();
  const options = useAdminOptions();
  const [offset, setOffset] = useState(0);
  const [selection, setSelection] = useState<{
    item: CatalogItem;
    action: 'approve' | 'reject' | 'merge';
  } | null>(null);
  const [id, setId] = useState(params.get('skill_id') ?? '');
  const detail = useAdminQuery(
    id ? `/catalogs/skills/${encodeURIComponent(id)}` : null,
    adminSchemas.catalog,
  );
  const card = detail.data;
  const list = useAdminQuery(
    `/catalogs/skills/pending?limit=20&offset=${offset}`,
    adminSchemas.catalogs,
  );
  const row = (item: CatalogItem) => (
    <StaggerItem
      key={item.id}
      className="grid min-w-0 gap-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 wrap-anywhere">
        <div className="min-w-0">
          <h2 className="font-medium">{item.name}</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {item.code}
            {(item.aliases ?? []).length > 0 &&
              ` · ${item.aliases!.join(', ')}`}
          </p>
          {item.submitted_at && (
            <p className="mt-1 text-xs text-caption">
              Отправлен: {new Date(item.submitted_at).toLocaleString('ru-RU')}
              {item.submitted_by && ` · Автор: ${item.submitted_by}`}
            </p>
          )}
          {item.moderation_reason && (
            <p className="mt-2 text-sm">Причина: {item.moderation_reason}</p>
          )}
        </div>
        <Status value={item.moderation_status ?? 'pending'} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&_button]:min-h-11">
        {item.moderation_status === 'pending' && (
          <Button
            size="sm"
            onClick={() => setSelection({ item, action: 'approve' })}
          >
            Одобрить
          </Button>
        )}
        {(item.moderation_status === 'pending' ||
          item.moderation_status === 'approved') && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelection({ item, action: 'merge' })}
            >
              Объединить
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setSelection({ item, action: 'reject' })}
            >
              Отклонить
            </Button>
          </>
        )}
      </div>
    </StaggerItem>
  );
  const refresh = () => {
    list.reload();
    detail.reload();
    options.reload();
  };
  return (
    <div className="grid min-w-0 gap-6">
      <AdminPageHeader
        title="Модерация навыков"
        description="Проверьте названия, одобрите новые навыки или объедините дубли."
      />
      <Card className="relative min-w-0 gap-4 p-4 sm:p-6">
        <h2 className="font-medium">Ожидают решения</h2>
        <ErrorNotice error={list.error} onRetry={list.reload} />
        <p role="status" aria-live="polite" className="sr-only">
          {list.loading ? 'Загружаем очередь…' : ''}
        </p>
        <div>
          <AdminListLoading loading={list.loading} hasData={!!list.data} />
          {!list.loading && !list.error && !list.data?.items.length && (
            <p className="py-6 text-center text-muted-foreground">
              Очередь пуста
            </p>
          )}
          <AdminAnimatedList>{list.data?.items.map(row)}</AdminAnimatedList>
        </div>
        <Pagination
          offset={offset}
          count={list.data?.items.length ?? 0}
          loading={list.loading}
          onChange={setOffset}
        />
      </Card>
      <Card className="relative min-w-0 gap-4 p-4 sm:p-6">
        <h2 className="font-medium">Уже одобренные навыки</h2>
        <p className="text-sm text-muted-foreground">
          Одобренный навык тоже можно отклонить или объединить.
        </p>
        <SkillPicker
          label="Выберите навык"
          value={id}
          onChange={setId}
          items={(options.data.skills ?? []).filter(
            (s) => s.moderation_status === 'approved',
          )}
          disabled={options.loading}
        />
        <ErrorNotice error={options.error} onRetry={options.reload} />
        <ErrorNotice error={detail.error} onRetry={detail.reload} />
        {detail.loading && <p role="status">Открываем навык…</p>}
        {card && row(card)}
      </Card>
      {selection && (
        <ModerationEditor
          {...selection}
          onClose={() => setSelection(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
};
