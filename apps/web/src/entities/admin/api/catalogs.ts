import { z } from 'zod';

import type { CatalogItem, CatalogKind } from '../model';
import { adminRequest } from './adminRequest';
import {
  invalidateAdminCatalogs,
  primeAdminCatalogCache,
  readAdminCatalogCache,
} from './catalogCache';
import { queryString } from './queryString';
import { adminSchemas } from './schemas';

type GetAdminCatalogsParams = {
  q?: string;
  offset?: number;
  limit?: number;
};

type CreateAdminCatalogItemInput = {
  code: string;
  name: string;
  aliases?: string[];
  rank?: number;
};

type UpdateAdminCatalogItemInput = {
  name?: string;
  aliases?: string[];
  active?: boolean;
};

const catalogPath = (kind: CatalogKind, id?: string) =>
  `/catalogs/${kind}${id ? `/${encodeURIComponent(id)}` : ''}`;

export const getAdminCatalogs = (
  token: string,
  kind: CatalogKind,
  params: GetAdminCatalogsParams = {},
  signal?: AbortSignal,
) => {
  const query = queryString({
    q: params.q?.trim() || undefined,
    offset: params.offset ?? 0,
    limit: params.limit ?? 100,
  });
  return readAdminCatalogCache(
    token,
    `${kind}:page:${query}`,
    async (sharedSignal) => {
      const page = await adminRequest(
        token,
        `${catalogPath(kind)}?${query}`,
        adminSchemas.catalogs,
        { signal: sharedSignal },
      );
      sharedSignal.throwIfAborted();
      if (kind === 'skills')
        for (const item of page.items)
          primeAdminCatalogCache(token, `skills:item:${item.id}`, item);
      return page;
    },
    signal,
  );
};

export const getAdminSkill = (
  token: string,
  id: string,
  signal?: AbortSignal,
) =>
  readAdminCatalogCache(
    token,
    `skills:item:${id}`,
    (sharedSignal) =>
      adminRequest(token, catalogPath('skills', id), adminSchemas.catalog, {
        signal: sharedSignal,
      }),
    signal,
  );

export const loadAdminCatalog = (
  token: string,
  kind: CatalogKind,
  signal?: AbortSignal,
) =>
  readAdminCatalogCache(
    token,
    `${kind}:all`,
    async (sharedSignal) => {
      const items: CatalogItem[] = [];
      for (let offset = 0; offset <= 10000; offset += 100) {
        const page = await getAdminCatalogs(
          token,
          kind,
          { limit: 100, offset },
          sharedSignal,
        );
        items.push(...page.items);
        if (page.total !== undefined && items.length >= page.total)
          return items;
        if (page.items.length < 100) {
          if (page.total !== undefined && items.length < page.total)
            throw new Error(
              'API вернул неполный справочник. Повторите загрузку.',
            );
          return items;
        }
      }
      throw new Error(
        'Достигнут предел загрузки справочника (10 100 записей). Полный список недоступен; уточните данные на сервере.',
      );
    },
    signal,
  );

export const createAdminCatalogItem = async (
  token: string,
  kind: CatalogKind,
  body: CreateAdminCatalogItemInput,
) => {
  const saved = await adminRequest(
    token,
    catalogPath(kind),
    adminSchemas.catalog,
    {
      method: 'POST',
      body,
    },
  );
  invalidateAdminCatalogs(kind, token);
  return saved;
};

export const updateAdminCatalogItem = async (
  token: string,
  kind: CatalogKind,
  id: string,
  body: UpdateAdminCatalogItemInput,
) => {
  const saved = await adminRequest(
    token,
    catalogPath(kind, id),
    adminSchemas.catalog,
    {
      method: 'PATCH',
      body,
    },
  );
  invalidateAdminCatalogs(kind, token);
  return saved;
};

export const deleteAdminCatalogItem = async (
  token: string,
  kind: CatalogKind,
  id: string,
) => {
  const saved = await adminRequest(
    token,
    catalogPath(kind, id),
    z.undefined(),
    {
      method: 'DELETE',
    },
  );
  invalidateAdminCatalogs(kind, token);
  return saved;
};
