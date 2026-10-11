import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { EMPLOYER_DRAFT_SCOPE, STATIC_ROUTES } from '@/shared/contants';
import {
  useAsyncMutation,
  useRemoteData,
  useUnsavedChanges,
} from '@/shared/hooks';
import { toast } from '@/shared/ui';
import {
  type Company,
  type CompanyFile,
  type CompanyFilePurpose,
} from '@/entities/company';

import { validateCompanyFile } from '../lib';
import { type CompanyManagementApi } from './management';

export type CompanyDocumentsOptions = {
  company: Company;
  active?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  api: CompanyManagementApi;
  onCompanyChange: () => Promise<void>;
  onBusyChange: (value: boolean) => void;
};

export const useCompanyDocuments = ({
  company,
  active = true,
  onDirtyChange,
  api,
  onCompanyChange,
  onBusyChange,
}: CompanyDocumentsOptions) => {
  const [offset, setOffset] = useState(0);
  const [documentRevision, setDocumentRevision] = useState(0);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const load = useCallback(
    (signal: AbortSignal) => api.getCompanyFiles(company.id, offset, signal),
    [api, company.id, offset],
  );
  const remote = useRemoteData(load, 0, active);
  const mutation = useAsyncMutation();
  const busy = verificationBusy || mutation.pending;
  const [purpose, setPurpose] =
    useState<CompanyFilePurpose>('company_document');
  const [file, setFile] = useState<File | null>(null);

  const { markSaved } = useUnsavedChanges(!!file, {
    preserveWithin: useMemo(
      () => [
        STATIC_ROUTES.EMPLOYER,
        STATIC_ROUTES.EMPLOYER_PROFILE,
        STATIC_ROUTES.EMPLOYER_DOCUMENTS,
        STATIC_ROUTES.EMPLOYER_TEAM,
        STATIC_ROUTES.EMPLOYER_VACANCIES,
        STATIC_ROUTES.EMPLOYER_CANDIDATES,
        STATIC_ROUTES.EMPLOYER_OFFERS,
      ],
      [],
    ),
    scopeSearchParams: EMPLOYER_DRAFT_SCOPE,
  });

  useEffect(() => {
    onDirtyChange?.(!!file);
    return () => onDirtyChange?.(false);
  }, [file, onDirtyChange]);

  const [remove, setRemove] = useState<CompanyFile | null>(null);
  const [logoState, setLogo] = useState({ fileId: '', url: '' });
  const logo = logoState.fileId === company.logoFileId ? logoState.url : '';
  const input = useRef<HTMLInputElement>(null);
  const readonly = company.memberRole !== 'owner';

  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);

  useEffect(() => {
    if (!active || !company.logoFileId) return;
    const controller = new AbortController();
    let url = '';
    void api
      .downloadCompanyFile(company.id, company.logoFileId, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setLogo({ fileId: company.logoFileId!, url });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLogo({ fileId: company.logoFileId!, url: '' });
          toast.error('Не удалось загрузить логотип компании.');
        }
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [api, company.id, company.logoFileId, active]);

  const refresh = async () => {
    setDocumentRevision((value) => value + 1);
    remote.retry();
    await onCompanyChange();
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) return;
    void mutation.run(async () => {
      await validateCompanyFile(file, purpose);
      try {
        await api.uploadCompanyFile(company.id, file, purpose);
      } catch (error) {
        remote.retry();
        throw error;
      }
      setFile(null);
      markSaved();
      if (input.current) input.current.value = '';
      await refresh();
      toast.success('Файл загружен');
    });
  };

  const handleSubmit = async (): Promise<boolean> => {
    if (!remove) return false;

    try {
      await mutation.run(async () => {
        await api.deleteCompanyFile(company.id, remove.id);
        await refresh();
        toast.success('Файл удалён');
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleDownload = (item: CompanyFile) => {
    void mutation.run(async () => {
      const blob = await api.downloadCompanyFile(company.id, item.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.originalName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  };

  return {
    offset,
    setOffset,
    documentRevision,
    setVerificationBusy,
    remote,
    mutation,
    busy,
    purpose,
    setPurpose,
    file,
    setFile,
    remove,
    setRemove,
    logo,
    input,
    readonly,
    handleFormSubmit,
    handleSubmit,
    handleDownload,
  };
};
