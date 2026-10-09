import { useCallback, useEffect, useRef, useState } from 'react';

import { useUnsavedChanges } from '@/shared/hooks';
import {
  AdminApiError,
  deleteAdminPreview,
  getAdminPreview,
  type Preview,
  type PreviewAnswer,
  saveAdminPreviewAnswer,
  startAdminPreview,
  submitAdminPreview,
} from '@/entities/admin';

import {
  equalPreviewAnswers,
  getPreviewAnswerIssue,
  getPreviewRecovery,
  previewSecondsRemaining,
} from '../lib';
import { useAdminSession } from './index';

export const useServerPreview = (templateId: string) => {
  const { session } = useAdminSession();
  const [data, setData] = useState<Preview | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PreviewAnswer>>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const lock = useRef(false);
  const anchor = useRef(0);
  const expiredRead = useRef(false);
  const storageKey = `fsp.admin.preview.${session?.admin.id}.${templateId}`;
  const accept = useCallback((next: Preview) => {
    setData(next);
    if (next.status !== 'in_progress') setDrafts({});
    anchor.current = performance.now();
    expiredRead.current = false;
    setSeconds(previewSecondsRemaining(next.expires_at, next.server_time, 0));
  }, []);
  const remember = useCallback(
    (id: string) => {
      localStorage.setItem(storageKey, JSON.stringify({ id }));
      const url = new URL(window.location.href);
      url.searchParams.set('preview_id', id);
      window.history.replaceState(null, '', url);
    },
    [storageKey],
  );
  const run = async (action: () => Promise<void>) => {
    if (lock.current || !session) return false;

    lock.current = true;
    setBusy(true);
    setError(null);

    try {
      await action();
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const refresh = () =>
    run(async () => {
      if (data && session)
        accept(await getAdminPreview(session.access_token, data.id));
    });
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const { id } = getPreviewRecovery(
      localStorage.getItem(storageKey),
      new URL(window.location.href).searchParams.get('preview_id'),
    );
    if (!id) return;
    // Loading starts at the asynchronous restore boundary.
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) setBusy(true);
    });
    void getAdminPreview(session.access_token, id, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        if (next.template_id !== templateId)
          throw new Error('Этот предпросмотр принадлежит другому шаблону.');
        remember(next.id);
        accept(next);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [session, storageKey, templateId, accept, remember]);
  useEffect(() => {
    if (!data || data.status !== 'in_progress' || !session) return;
    const tick = () => {
      const remaining = previewSecondsRemaining(
        data.expires_at,
        data.server_time,
        performance.now() - anchor.current,
      );
      setSeconds(remaining);
      if (!remaining && !expiredRead.current && !lock.current) {
        expiredRead.current = true;
        void getAdminPreview(session.access_token, data.id)
          .then(accept)
          .catch(setError);
      }
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [data, session, accept]);
  const dirty =
    data?.questions.filter(
      (q) => drafts[q.id] && !equalPreviewAnswers(q.answer, drafts[q.id]),
    ) ?? [];
  useUnsavedChanges(dirty.length > 0);
  const start = () =>
    run(async () => {
      if (!session) return;
      const saved = getPreviewRecovery(
        localStorage.getItem(storageKey),
        new URL(window.location.href).searchParams.get('preview_id'),
      );
      const existingId = saved.id;
      if (existingId) {
        const next = await getAdminPreview(session.access_token, existingId);
        if (next.template_id !== templateId)
          throw new Error('Этот предпросмотр принадлежит другому шаблону.');
        accept(next);
        return;
      }
      const key = saved.key ?? crypto.randomUUID();
      localStorage.setItem(storageKey, JSON.stringify({ key }));
      const next = await startAdminPreview(
        session.access_token,
        templateId,
        key,
      );
      remember(next.id);
      setDrafts({});
      accept(next);
    });
  const save = (questionId: string) =>
    run(async () => {
      if (!data || !session) return;
      const q = data.questions.find((q) => q.id === questionId);
      const answer = drafts[questionId];
      if (!q || !answer) return;
      const issue = getPreviewAnswerIssue(q, answer);
      if (issue) throw new Error(issue);
      try {
        await saveAdminPreviewAnswer(
          session.access_token,
          data.id,
          q.id,
          answer,
        );
        setData((current) =>
          current
            ? {
                ...current,
                questions: current.questions.map((item) =>
                  item.id === q.id ? { ...item, answer } : item,
                ),
              }
            : current,
        );
        setDrafts((values) => {
          const next = { ...values };
          delete next[q.id];
          return next;
        });
      } catch (err) {
        if (
          err instanceof AdminApiError &&
          ['preview_expired', 'preview_closed'].includes(err.code)
        ) {
          accept(await getAdminPreview(session.access_token, data.id));
          setDrafts({});
        }
        throw err;
      }
    });
  const submit = () =>
    run(async () => {
      if (!data || !session) return;
      if (dirty.length)
        throw new Error(
          'Сначала сохраните изменённые ответы или отмените изменения.',
        );
      accept(await submitAdminPreview(session.access_token, data.id));
      setDrafts({});
    });
  const remove = () =>
    run(async () => {
      if (data && session)
        await deleteAdminPreview(session.access_token, data.id);
      localStorage.removeItem(storageKey);
      const url = new URL(window.location.href);
      url.searchParams.delete('preview_id');
      window.history.replaceState(null, '', url);
      setData(null);
      setDrafts({});
    });
  const forgetMissing = () => {
    localStorage.removeItem(storageKey);
    const url = new URL(window.location.href);
    url.searchParams.delete('preview_id');
    window.history.replaceState(null, '', url);
    setError(null);
    setData(null);
    setDrafts({});
  };
  return {
    data,
    drafts,
    dirty,
    error,
    busy,
    seconds,
    start,
    save,
    submit,
    remove,
    refresh,
    forgetMissing,
    update: (id: string, answer: PreviewAnswer) =>
      setDrafts((values) => ({ ...values, [id]: answer })),
    discard: (id: string) =>
      setDrafts((values) => {
        const next = { ...values };
        delete next[id];
        return next;
      }),
  };
};
