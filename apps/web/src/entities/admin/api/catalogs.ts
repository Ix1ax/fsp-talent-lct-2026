import { z } from 'zod';

import type { CatalogKind } from '../model';
import { adminRequest, adminSchemas, queryString } from './index';

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
) =>
  adminRequest(
    token,
    `${catalogPath(kind)}?${queryString(params)}`,
    adminSchemas.catalogs,
    { signal },
  );

export const createAdminCatalogItem = (
  token: string,
  kind: CatalogKind,
  body: CreateAdminCatalogItemInput,
) =>
  adminRequest(token, catalogPath(kind), adminSchemas.catalog, {
    method: 'POST',
    body,
  });

export const updateAdminCatalogItem = (
  token: string,
  kind: CatalogKind,
  id: string,
  body: UpdateAdminCatalogItemInput,
) =>
  adminRequest(token, catalogPath(kind, id), adminSchemas.catalog, {
    method: 'PATCH',
    body,
  });

export const deleteAdminCatalogItem = (
  token: string,
  kind: CatalogKind,
  id: string,
) =>
  adminRequest(token, catalogPath(kind, id), z.undefined(), {
    method: 'DELETE',
  });
