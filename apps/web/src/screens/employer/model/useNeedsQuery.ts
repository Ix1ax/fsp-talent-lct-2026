'use client';
import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import type { EmployerNeed, NeedStatus } from '@/entities/employer-need';

import type { EmployerGateway } from '../lib/gateway';
interface NeedsQueryOptions {
  api: EmployerGateway;
  companyId: string;
  status: NeedStatus;
  offset: number;
  selectedId: string;
  revision: number;
  enabled: boolean;
}
interface ListResult {
  key: string;
  items: EmployerNeed[];
  hasMore: boolean;
  error: string;
}
interface DetailResult {
  key: string;
  need: EmployerNeed | null;
  error: string;
}

/** Список и деталь независимы: ошибка детали не скрывает список компании. */
export const useNeedsQuery = ({
  api,
  companyId,
  status,
  offset,
  selectedId,
  revision,
  enabled,
}: NeedsQueryOptions) => {
  const [listResult, setListResult] = useState<ListResult | null>(null);
  const [detailResult, setDetailResult] = useState<DetailResult | null>(null);
  const listKey = [companyId, status, offset, revision].join(':');
  const detailKey = [companyId, selectedId, revision].join(':');
  const page = enabled && listResult?.key === listKey ? listResult : null;
  const detail =
    enabled && detailResult?.key === detailKey ? detailResult : null;
  const fromList = page?.items.find((need) => need.id === selectedId) ?? null;
  useEffect(() => {
    if (!enabled || !companyId) return;
    const controller = new AbortController();
    api
      .needs(companyId, status, offset, controller.signal)
      .then((page) => {
        if (!controller.signal.aborted)
          setListResult({
            key: listKey,
            items: page.items,
            hasMore: page.items.length === page.limit,
            error: '',
          });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setListResult({
            key: listKey,
            items: [],
            hasMore: false,
            error: getApiErrorMessage(error),
          });
      });
    return () => controller.abort();
  }, [api, companyId, status, offset, revision, enabled, listKey]);
  useEffect(() => {
    if (!enabled || !companyId || !selectedId || fromList) return;
    const controller = new AbortController();
    api
      .need(companyId, selectedId, controller.signal)
      .then((need) => {
        if (!controller.signal.aborted)
          setDetailResult({ key: detailKey, need, error: '' });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setDetailResult({
            key: detailKey,
            need: null,
            error: getApiErrorMessage(error),
          });
      });
    return () => controller.abort();
  }, [api, companyId, selectedId, revision, enabled, detailKey, fromList]);
  const previousNeed = listResult?.key.startsWith(`${companyId}:`)
    ? (listResult.items.find((need) => need.id === selectedId) ?? null)
    : null;
  const previousDetail = detailResult?.key.startsWith(
    `${companyId}:${selectedId}:`,
  )
    ? detailResult.need
    : null;
  const selected =
    fromList ??
    detail?.need ??
    (detail?.error ? null : (previousNeed ?? previousDetail));
  return {
    items: page?.items ?? [],
    selected,
    hasMore: page?.hasMore ?? false,
    listError: page?.error ?? '',
    detailError: fromList ? '' : (detail?.error ?? ''),
    loading: enabled && !!companyId && !page,
    detailLoading: enabled && !!selectedId && !selected && !detail,
  };
};
