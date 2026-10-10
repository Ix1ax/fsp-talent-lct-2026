import { useState } from 'react';

import { Button } from '@/shared/ui';
import { taskErrorMessage } from '@/features/task-solution';

interface TaskFileDownloadProps {
  name: string;
  load: () => Promise<Blob>;
}

export const TaskFileDownload = ({ name, load }: TaskFileDownloadProps) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setPending(true);
    setError('');

    try {
      const blob = await load();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(taskErrorMessage(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => void download()}
      >
        {pending ? 'Скачиваем…' : 'Скачать файл'}
      </Button>
      <p className="break-all text-sm text-muted-foreground">{name}</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
