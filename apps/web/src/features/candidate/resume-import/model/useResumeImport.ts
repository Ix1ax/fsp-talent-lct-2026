import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { ApiError, ensureClientAccessToken } from '@/shared/api';
import { STATIC_ROUTES } from '@/shared/contants';
import { useUnsavedChanges } from '@/shared/hooks';
import { createUuid } from '@/shared/utils';
import {
  type CandidateEducation,
  type CandidateExperience,
  getCandidateEducations,
  getCandidateExperiences,
  importCandidateResume,
  type ResumeImportResult,
} from '@/entities/candidate';

import {
  getImportRetryAt,
  getResumeChanges,
  getResumeFormPatches,
  getResumeImportError,
} from '../lib';
import { RESUME_MAX_BYTES } from './limits';
import {
  type AppliedResume,
  type ResumeCurrentDraft,
  type ResumeFieldChange,
} from './types';

type Review = {
  result: ResumeImportResult;
  experience: CandidateExperience[];
  education: CandidateEducation[];
  changes: ResumeFieldChange[];
};
export type ResumeImportOptions = {
  processing: boolean;
  profileId?: string;
  busy: boolean;
  getCurrentDraft: () => ResumeCurrentDraft;
  onBusyChange: (busy: boolean) => void;
  onConsentRequired: () => Promise<void>;
  onApply: (resume: AppliedResume) => void;
};
export const useResumeImport = (props: ResumeImportOptions) => {
  const id = useId();
  const [file, setFile] = useState<File>();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<ResumeImportResult>();
  const [review, setReview] = useState<Review>();
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [uploading, setUploading] = useState(false);
  const running = useRef(false);
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);

  useUnsavedChanges(!!file || !!pending, {
    preserveWithin: useMemo(
      () => [
        STATIC_ROUTES.CANDIDATE,
        STATIC_ROUTES.CANDIDATE_CONSENTS,
        STATIC_ROUTES.CANDIDATE_PROFILE,
        STATIC_ROUTES.CANDIDATE_CONTACTS,
        STATIC_ROUTES.CANDIDATE_EXPERIENCE,
        STATIC_ROUTES.CANDIDATE_EDUCATION,
        STATIC_ROUTES.CANDIDATE_SKILLS,
        STATIC_ROUTES.CANDIDATE_READINESS,
      ],
      [],
    ),
  });

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    const update = () => {
      setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    };
    update();

    if (!retryAt) return;
    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [retryAt]);

  const upload = async () => {
    if (
      !file ||
      !props.processing ||
      props.busy ||
      running.current ||
      remaining > 0
    ) {
      return;
    }

    if (file.size > RESUME_MAX_BYTES) {
      setMessage('Размер PDF должен быть не больше 5 МБ.');
      return;
    }

    running.current = true;
    setUploading(true);
    props.onBusyChange(true);
    setMessage('');
    const controller = new AbortController();
    request.current = controller;

    try {
      await ensureClientAccessToken();
      if (controller.signal.aborted) return;

      const result =
        pending ?? (await importCandidateResume(file, controller.signal));
      if (controller.signal.aborted) return;
      setPending(result);

      const [experience, education] = props.profileId
        ? await Promise.all([
            getCandidateExperiences(controller.signal),
            getCandidateEducations(controller.signal),
          ])
        : [{ items: [] }, { items: [] }];

      if (controller.signal.aborted) return;

      setReview({
        result,
        experience: experience.items,
        education: education.items,
        changes: getResumeChanges(result.draft, props.getCurrentDraft()),
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessage(getResumeImportError(error));
      if (error instanceof ApiError && error.code === 'import_busy')
        setRetryAt(getImportRetryAt(error.retryAfter));
      if (error instanceof ApiError && error.code === 'consent_required') {
        try {
          await props.onConsentRequired();
        } catch {
          if (controller.signal.aborted) return;
          setMessage(
            'Импорт требует согласия. Не удалось обновить согласия — повторите загрузку данных.',
          );
        }
      }
    } finally {
      running.current = false;
      request.current = null;
      setUploading(false);
      props.onBusyChange(false);
    }
  };

  const handleApply = () => {
    if (!props.processing || !review) return;
    const importId = createUuid();
    const patches = getResumeFormPatches(review.result.draft);
    props.onApply({
      id: importId,
      result: review.result,
      profile: { id: importId, values: patches.profile },
      contacts: { id: importId, values: patches.contacts },
    });
    setReview(undefined);
    setPending(undefined);
    setFile(undefined);
    if (input.current) input.current.value = '';
  };

  return {
    id,
    file,
    setFile,
    message,
    setMessage,
    setPending,
    review,
    setReview,
    remaining,
    uploading,
    input,
    uploadButton,
    upload,
    handleApply,
  };
};
