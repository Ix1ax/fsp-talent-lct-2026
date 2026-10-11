'use client';
import Image from 'next/image';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDeleteDialog,
  FileInput,
  OptionSelect,
  PageControls,
  RemoteState,
} from '@/shared/ui';
import { type Company, type CompanyFilePurpose } from '@/entities/company';

import { type CompanyManagementApi, useCompanyDocuments } from '../model';
import { CompanyFileItem } from './CompanyFileItem';
import { CompanyVerificationCard } from './CompanyVerificationCard';

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
  const {
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
  } = useCompanyDocuments({
    company,
    active,
    onDirtyChange,
    api,
    onCompanyChange,
    onBusyChange,
  });
  return (
    <div className="grid gap-5">
      <CompanyVerificationCard
        documentRevision={documentRevision}
        company={company}
        api={api}
        active={active}
        pending={mutation.pending}
        onCompanyChange={onCompanyChange}
        onBusyChange={setVerificationBusy}
      />
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
              className="grid gap-4 rounded-xl border border-border/60 bg-muted/50 p-4 sm:p-5"
              onSubmit={handleFormSubmit}
            >
              <fieldset disabled={busy} className="grid gap-4">
                <label className="grid gap-2 text-sm">
                  Назначение
                  <OptionSelect
                    aria-label="Назначение файла"
                    disabled={busy}
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
                <div className="grid gap-2 text-sm">
                  <span id={`${company.id}-file-label`}>Файл</span>
                  <FileInput
                    ref={input}
                    aria-labelledby={`${company.id}-file-label`}
                    fileName={file?.name ?? null}
                    required
                    accept={
                      purpose === 'company_logo'
                        ? 'image/jpeg,image/png'
                        : 'application/pdf,image/jpeg,image/png'
                    }
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
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
          <RemoteState
            {...remote}
            empty={remote.data?.items.length === 0}
            emptyTitle="Документов пока нет"
            emptyDescription={
              readonly
                ? 'Владелец компании может загрузить документы и логотип.'
                : 'Загрузите документы компании или добавьте логотип.'
            }
          />
          {remote.data && (
            <>
              {remote.data.items.map((item) => (
                <CompanyFileItem
                  item={item}
                  busy={busy}
                  readonly={readonly}
                  handleDownload={handleDownload}
                  mutation={mutation}
                  setRemove={setRemove}
                  key={item.id}
                />
              ))}
              <PageControls
                offset={offset}
                count={remote.data.items.length}
                hasMore={remote.data.hasMore}
                pending={busy}
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
    </div>
  );
};
