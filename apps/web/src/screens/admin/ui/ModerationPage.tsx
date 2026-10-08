'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Button, Card } from '@/shared/ui';
import { adminSchemas, type CatalogItem } from '@/entities/admin';
import {
  ErrorNotice,
  ModerationEditor,
  Pagination,
  SkillPicker,
  Status,
  useAdminOptions,
  useAdminQuery,
} from '@/features/admin';

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
    <div
      key={item.id}
      className="grid gap-4 border-b py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-medium">{item.name}</h2>
          <Status value={item.moderation_status ?? 'pending'} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {item.code}
          {(item.aliases ?? []).length > 0 && ` · ${item.aliases!.join(', ')}`}
        </p>
        <p className="mt-1 text-xs text-caption">ID: {item.id}</p>
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
      <div className="flex flex-wrap gap-2">
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
              variant="destructive"
              onClick={() => setSelection({ item, action: 'reject' })}
            >
              Отклонить
            </Button>
          </>
        )}
      </div>
    </div>
  );
  const refresh = () => {
    list.reload();
    detail.reload();
    options.reload();
  };
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Модерация навыков</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Проверьте названия, одобрите новые навыки или объедините дубли.
        </p>
      </div>
      <Card className="gap-4 p-4 sm:p-6">
        <h2 className="font-medium">Ожидают решения</h2>
        <ErrorNotice error={list.error} />
        {list.loading && <p role="status">Загружаем очередь…</p>}
        {!list.loading && !list.error && !list.data?.items.length && (
          <p className="py-8 text-center text-muted-foreground">
            Очередь пуста
          </p>
        )}
        {list.data?.items.map(row)}
        <Pagination
          offset={offset}
          count={list.data?.items.length ?? 0}
          loading={list.loading}
          onChange={setOffset}
        />
      </Card>
      <Card className="gap-4 p-4 sm:p-6">
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
        <ErrorNotice error={options.error} />
        <ErrorNotice error={detail.error} />
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
