'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { MOTION_LAYOUT_IDS, STATIC_ROUTES } from '@/shared/contants';
import { confirmUnsavedChanges } from '@/shared/hooks';
import {
  AnimatedIndicator,
  Button,
  Card,
  ConfirmDeleteDialog,
  Input,
  StaggerItem,
} from '@/shared/ui';
import {
  AdminApiError,
  catalogKinds,
  catalogLabels,
  deleteAdminCatalogItem,
  queryString,
  updateAdminCatalogItem,
} from '@/entities/admin';
import {
  AdminAnimatedList,
  AdminListLoading,
  AdminListViewport,
  CatalogEditor,
  ErrorNotice,
  Field,
  Pagination,
  Status,
} from '@/features/admin';

import { useAdminCatalogs } from '../model';
import { AdminPageHeader } from './AdminPageHeader';
import { CatalogItemActions } from './CatalogItemActions';

export const CatalogsPage = () => {
  const {
    session,
    kind,
    setKind,
    search,
    setSearch,
    setQ,
    offset,
    setOffset,
    editor,
    setEditor,
    deleting,
    setDeleting,
    debounce,
    cancel,
    catalogs,
    loading,
    loadError,
    reload,
    mutation,
    toggle,
  } = useAdminCatalogs();
  return (
    <div className="grid min-w-0 content-start gap-6">
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
        role="group"
        aria-label="Вид справочника"
        className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:flex sm:flex-wrap"
      >
        {catalogKinds.map((value) => (
          <Button
            key={value}
            variant="ghost"
            className="relative isolate h-auto min-h-11 whitespace-normal"
            aria-pressed={kind === value}
            onClick={() => {
              if (value === kind || !confirmUnsavedChanges()) return;
              cancel();
              setKind(value);
              setOffset(0);
              setSearch('');
              setQ('');
              setEditor(null);
            }}
          >
            {kind === value && (
              <AnimatedIndicator
                layoutId={MOTION_LAYOUT_IDS.ADMIN_CATALOG_KIND}
                className="absolute inset-0 -z-10 rounded-md bg-card"
              />
            )}
            {catalogLabels[value]}
          </Button>
        ))}
      </div>
      <Card className="relative min-w-0 gap-4 p-4 sm:p-6">
        <Field label="Найти запись" reserveErrorSpace={false}>
          <Input
            type="search"
            aria-label="Поиск по справочнику"
            placeholder="Поиск по названию, коду или синониму"
            maxLength={100}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              debounce(e.target.value);
            }}
          />
        </Field>
        <ErrorNotice error={loadError} onRetry={reload} />
        <ErrorNotice error={mutation.error} />
        <p role="status" aria-live="polite" className="sr-only">
          {loading ? 'Загружаем справочник…' : ''}
        </p>
        <AdminListViewport loading={loading} className="border-t">
          <AdminListLoading loading={loading} hasData={!!catalogs} />
          {!loading && !loadError && !catalogs?.items.length && (
            <p className="py-6 text-center text-muted-foreground">
              Записей не найдено
            </p>
          )}
          <AdminAnimatedList>
            {catalogs?.items.map((item) => {
              const editable =
                kind !== 'skills' || item.moderation_status === 'approved';
              return (
                <StaggerItem
                  key={item.id}
                  className="grid min-w-0 gap-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
                >
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 wrap-anywhere">
                    <div className="min-w-0">
                      <span className="font-medium">{item.name}</span>

                      <p className="mt-1 text-xs text-caption">
                        {item.code}
                        {item.rank !== undefined && ` · Порядок: ${item.rank}`}
                        {(item.aliases ?? []).length > 0 &&
                          ` · ${item.aliases!.join(', ')}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-center gap-1.5 self-center">
                      <Status
                        value={item.active === false ? 'archived' : 'active'}
                      />
                      {item.moderation_status && (
                        <Status value={item.moderation_status} />
                      )}
                    </div>
                  </div>
                  {editable ? (
                    <CatalogItemActions
                      item={item}
                      kind={kind}
                      busy={mutation.busy}
                      onEdit={() => setEditor(item)}
                      onToggle={() => toggle(item)}
                      onDelete={() => setDeleting(item)}
                    />
                  ) : (
                    <Link
                      href={`${STATIC_ROUTES.ADMIN_MODERATION}?${queryString({ skill_id: item.id })}`}
                      className="flex min-h-11 items-center text-sm text-brand-text"
                    >
                      К модерации
                    </Link>
                  )}
                </StaggerItem>
              );
            })}
          </AdminAnimatedList>
        </AdminListViewport>
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
          onSaved={() => {}}
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
