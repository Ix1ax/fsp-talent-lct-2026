import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';

import { Button } from '@/shared/ui';
import { adminDownloadFile } from '@/entities/admin';

import { useAdminSession } from '../model';
import { ErrorNotice } from './Common';

interface AdminFileDownloadProps {
  path: string;
  name: string;
  disabled?: boolean;
}
export const AdminFileDownload = ({
  path,
  name,
  disabled,
}: AdminFileDownloadProps) => {
  const { session } = useAdminSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), [session]);
  const download = async () => {
    if (!session || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError(null);
    try {
      const blob = await adminDownloadFile(
        session.access_token,
        path,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      if (!controller.signal.aborted) setError(err);
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        onClick={() => void download()}
      >
        <Download size={16} />
        {busy ? 'Скачиваем…' : 'Скачать файл'}
      </Button>
      <ErrorNotice error={error} />
    </div>
  );
};
