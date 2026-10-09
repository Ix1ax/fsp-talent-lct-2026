'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';

import {
  EMPLOYER_DRAFT_SCOPE,
  FILE_STATUS,
  STATIC_ROUTES,
} from '@/shared/contants';
import { useAsyncMutation, useUnsavedChanges } from '@/shared/hooks';
import { useRemoteData } from '@/shared/hooks';
import {
  AsyncState,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDeleteDialog,
  Input,
  OptionSelect,
  PageControls,
  RemoteState,
  toast,
} from '@/shared/ui';
import type {
  Company,
  CompanyFile,
  CompanyFilePurpose,
} from '@/entities/company';

import { validateCompanyFile } from '../lib';
import type { CompanyManagementApi } from '../model';

interface CompanyDocumentsProps {
  company: Company;
  active?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  api: CompanyManagementApi;
  onCompanyChange: () => Promise<void>;
  onBusyChange: (value: boolean) => void;
}

export const CompanyDocuments = ({
  company,
  active = true,
  onDirtyChange,
  api,
  onCompanyChange,
  onBusyChange,
}: CompanyDocumentsProps) => {
  const [offset, setOffset] = useState(0);
  const load = useCallback(
    (signal: AbortSignal) => api.getCompanyFiles(company.id, offset, signal),
    [api, company.id, offset],
  );
  const remote = useRemoteData(load, 0, active);
  const mutation = useAsyncMutation();
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
    onBusyChange(mutation.pending);
    return () => onBusyChange(false);
  }, [mutation.pending, onBusyChange]);

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
      .catch(() => {});
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [api, company.id, company.logoFileId, active]);

  const refresh = async () => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Документы и логотип</CardTitle>
        <CardDescription>
          PDF, JPEG или PNG до 10 МБ. Логотип — JPEG или PNG до 2 МБ.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {logo && (
          <div className="flex items-center gap-4">
            <Image
              width={80}
              height={80}
              unoptimized
              src={logo}
              alt={`Логотип ${company.name}`}
              className="size-20 rounded-xl border object-contain"
            />
            <span className="text-sm text-muted-foreground">
              Текущий логотип
            </span>
          </div>
        )}
        {!readonly && (
          <form
            className="grid gap-4 rounded-lg border p-4"
            onSubmit={handleFormSubmit}
          >
            <fieldset disabled={mutation.pending} className="grid gap-4">
              <label className="grid gap-2 text-sm">
                Назначение
                <OptionSelect
                  aria-label="Назначение файла"
                  disabled={mutation.pending}
                  value={purpose}
                  onValueChange={(value) =>
                    setPurpose(value as CompanyFilePurpose)
                  }
                  options={[
                    { value: 'company_document', label: 'Документ компании' },
                    { value: 'company_logo', label: 'Логотип компании' },
                  ]}
                />
              </label>
              <label className="grid gap-2 text-sm">
                Файл
                <Input
                  ref={input}
                  type="file"
                  required
                  accept={
                    purpose === 'company_logo'
                      ? 'image/jpeg,image/png'
                      : 'application/pdf,image/jpeg,image/png'
                  }
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <Button
                type="submit"
                size="lg"
                disabled={!file}
                className="sm:justify-self-start"
              >
                {mutation.pending ? 'Загружаем…' : 'Загрузить'}
              </Button>
            </fieldset>
          </form>
        )}
        <p className="text-sm text-muted-foreground">
          Загрузка документов не меняет статус проверки компании.
        </p>
        {mutation.error && (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error}
          </p>
        )}
        <RemoteState {...remote} />
        {remote.data && (
          <>
            {!remote.data.items.length && (
              <AsyncState
                title="Документов пока нет"
                description={
                  readonly
                    ? 'Владелец компании может загрузить документы и логотип.'
                    : 'Загрузите документы компании или добавьте логотип.'
                }
              />
            )}
            {remote.data.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-all font-medium">{item.originalName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.purpose === 'company_logo' ? 'Логотип' : 'Документ'} ·{' '}
                    {(item.sizeBytes / 1024 / 1024).toFixed(1)} МБ ·{' '}
                    {FILE_STATUS[item.status]}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={mutation.pending || item.status !== 'ready'}
                  onClick={() => handleDownload(item)}
                >
                  Скачать
                </Button>
                {!readonly && item.status !== 'deleted' && (
                  <Button
                    variant="ghost"
                    disabled={mutation.pending}
                    onClick={() => {
                      mutation.clearError();
                      setRemove(item);
                    }}
                  >
                    Удалить
                  </Button>
                )}
              </div>
            ))}
            <PageControls
              offset={offset}
              count={remote.data.items.length}
              pending={mutation.pending}
              onPage={setOffset}
            />
          </>
        )}
        {remove && (
          <ConfirmDeleteDialog
            title="Удалить файл?"
            description={`Файл «${remove.originalName}» будет удалён из компании.`}
            busy={mutation.pending}
            error={mutation.error}
            onClose={() => setRemove(null)}
            onConfirm={handleSubmit}
          />
        )}
      </CardContent>
    </Card>
  );
};
