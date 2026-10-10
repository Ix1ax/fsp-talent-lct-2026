import { useState } from 'react';
import { DownloadIcon, LoaderCircleIcon } from 'lucide-react';

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui';
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
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => void download()}
          >
            {pending ? (
              <LoaderCircleIcon
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <DownloadIcon aria-hidden="true" />
            )}
            {pending ? 'Скачиваем…' : 'Скачать файл'}
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6} className="motion-reduce:animate-none">
          Скачать «{name}» на устройство.
        </TooltipContent>
      </Tooltip>
      <p className="break-all text-sm text-muted-foreground">{name}</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};
