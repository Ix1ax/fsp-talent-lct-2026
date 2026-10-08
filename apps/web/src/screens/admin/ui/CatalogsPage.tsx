'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { useDebounce } from '@/shared/hooks';
import { Button, Card, ConfirmDeleteDialog, Input } from '@/shared/ui';
import {
  AdminApiError,
  type CatalogItem,
  type CatalogKind,
  catalogKinds,
  catalogLabels,
  deleteAdminCatalogItem,
  getAdminCatalogs,
  queryString,
  updateAdminCatalogItem,
} from '@/entities/admin';
import {
  AdminListLoading,
  CatalogEditor,
  ErrorNotice,
  Pagination,
  Status,
  useAdminMutation,
  useAdminSession,
} from '@/features/admin';

import { AdminPageHeader } from './AdminPageHeader';

export const CatalogsPage = () => {
  const { session } = useAdminSession();
  const [kind, setKind] = useState<CatalogKind>('specializations');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [editor, setEditor] = useState<CatalogItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<CatalogItem | null>(null);
  const { debounce, cancel } = useDebounce((value: string) => {
    setQ(value.trim());
    setOffset(0);
  }, 350);
  const [catalogs, setCatalogs] = useState<Awaited<
    ReturnType<typeof getAdminCatalogs>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const mutation = useAdminMutation(reload);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setCatalogs(null);
      try {
        const data = await getAdminCatalogs(
          session.access_token,
          kind,
          { q, offset, limit: 20 },
          controller.signal,
        );
        if (!controller.signal.aborted) setCatalogs(data);
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [session, kind, q, offset, revision]);

  const toggle = (item: CatalogItem) =>
    void mutation.run(async () => {
      await updateAdminCatalogItem(session!.access_token, kind, item.id, {
        active: item.active === false,
      });
      reload();
    });

  return (
    <div className="grid content-start gap-6">
      <AdminPageHeader
        title="Справочники"
        description="Значения для профилей, потребностей и тестов."
        action={
          <Button onClick={() => setEditor('new')}>
            <Plus />
            Добавить запись
          </Button>
        }
      />
      <div
        aria-label="Вид справочника"
        className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
      >
        {catalogKinds.map((value) => (
          <Button
            key={value}
            variant={kind === value ? 'secondary' : 'ghost'}
            aria-pressed={kind === value}
            onClick={() => {
              cancel();
              setKind(value);
              setOffset(0);
              setSearch('');
              setQ('');
              setEditor(null);
            }}
          >
            {catalogLabels[value]}
          </Button>
        ))}
      </div>
      <Card className="relative gap-4 p-4 sm:p-6">
        <Input
          aria-label="Поиск по справочнику"
          placeholder="Поиск по названию, коду или синониму"
          maxLength={100}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            debounce(e.target.value);
          }}
        />
        <ErrorNotice error={loadError} />
        <ErrorNotice error={mutation.error} />
        <p role="status" aria-live="polite" className="sr-only">
          {loading ? 'Загружаем справочник…' : ''}
        </p>
        <div className="divide-y border-t">
          <AdminListLoading loading={loading} hasData={!!catalogs} />
          {!loading && !loadError && !catalogs?.items.length && (
            <p className="py-6 text-center text-muted-foreground">
              Записей не найдено
            </p>
          )}
          {catalogs?.items.map((item) => {
            const editable =
              kind !== 'skills' || item.moderation_status === 'approved';
            return (
              <div
                key={item.id}
                className="grid gap-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    <Status
                      value={item.active === false ? 'archived' : 'active'}
                    />
                    {item.moderation_status && (
                      <Status value={item.moderation_status} />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-caption">
                    {item.code}
                    {item.rank !== undefined && ` · Порядок: ${item.rank}`}
                    {(item.aliases ?? []).length > 0 &&
                      ` · ${item.aliases!.join(', ')}`}
                  </p>
                </div>
                {editable ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditor(item)}
                    >
                      Изменить
                    </Button>
                    {kind === 'skills' && (
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={`/admin/moderation?${queryString({ skill_id: item.id })}`}
                        >
                          Модерация
                        </Link>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="min-w-28"
                      variant="ghost"
                      disabled={mutation.busy}
                      onClick={() => toggle(item)}
                    >
                      {item.active === false ? 'Восстановить' : 'В архив'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={mutation.busy}
                      onClick={() => setDeleting(item)}
                    >
                      Удалить
                    </Button>
                  </div>
                ) : (
                  <Link
                    href={`/admin/moderation?${queryString({ skill_id: item.id })}`}
                    className="text-sm text-brand-text"
                  >
                    К модерации
                  </Link>
                )}
              </div>
            );
          })}
        </div>
        <Pagination
          offset={offset}
          count={catalogs?.items.length ?? 0}
          loading={loading}
          onChange={setOffset}
        />
      </Card>
      {editor && (
        <CatalogEditor
          kind={kind}
          item={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={reload}
        />
      )}
      {deleting && (
        <ConfirmDeleteDialog
          title={`Удалить «${deleting.name}»?`}
          description="Запись будет удалена. Если она используется, можно сохранить связи через архивирование."
          busy={mutation.busy}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            mutation.run(async () => {
              await deleteAdminCatalogItem(
                session!.access_token,
                kind,
                deleting.id,
              );
              reload();
            })
          }
        >
          <ErrorNotice error={mutation.error} />
          {mutation.error instanceof AdminApiError &&
            mutation.error.code === 'catalog_item_in_use' && (
              <Button
                variant="outline"
                disabled={mutation.busy}
                onClick={() =>
                  void mutation.run(async () => {
                    await updateAdminCatalogItem(
                      session!.access_token,
                      kind,
                      deleting.id,
                      { active: false },
                    );
                    reload();
                    setDeleting(null);
                  })
                }
              >
                Архивировать вместо удаления
              </Button>
            )}
        </ConfirmDeleteDialog>
      )}
    </div>
  );
};
