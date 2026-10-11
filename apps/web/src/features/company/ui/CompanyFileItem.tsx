import { FILE_STATUS } from '@/shared/contants';
import { Button } from '@/shared/ui';
import { type CompanyFile } from '@/entities/company';

import { type useCompanyDocuments } from '../model';

interface CompanyFileItemProps {
  item: CompanyFile;
  busy: boolean;
  readonly: boolean;
  handleDownload: (item: CompanyFile) => void;
  mutation: ReturnType<typeof useCompanyDocuments>['mutation'];
  setRemove: (item: CompanyFile | null) => void;
}
export const CompanyFileItem = ({
  item,
  busy,
  readonly,
  handleDownload,
  mutation,
  setRemove,
}: CompanyFileItemProps) => {
  return (
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
        disabled={busy || item.status !== 'ready'}
        onClick={() => handleDownload(item)}
      >
        Скачать
      </Button>
      {!readonly && item.status !== 'deleted' && (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            mutation.clearError();
            setRemove(item);
          }}
        >
          Удалить
        </Button>
      )}
    </div>
  );
};
