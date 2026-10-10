'use client';
import { DownloadIcon, LoaderCircleIcon } from 'lucide-react';

import { useAsyncMutation } from '@/shared/hooks';
import {
  Button,
  FadeIn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui';
import { exportCandidatePDF } from '@/entities/candidate/profile';

interface CandidatePDFButtonProps {
  profileExists: boolean;
  processing: boolean;
  disabled?: boolean;
}
export const CandidatePDFButton = ({
  profileExists,
  processing,
  disabled,
}: CandidatePDFButtonProps) => {
  const mutation = useAsyncMutation();
  const download = async () => {
    try {
      const blob = await mutation.run(() => exportCandidatePDF());
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'resume.pdf';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      /* The mutation exposes the error inline. */
    }
  };
  const hint = !profileExists
    ? 'Сначала создайте профиль.'
    : 'Для скачивания нужно согласие на обработку данных.';
  return (
    <div className="grid gap-2">
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className="w-fit">
            <Button
              variant="outline"
              disabled={
                disabled || !profileExists || !processing || mutation.pending
              }
              onClick={() => void download()}
              className="min-h-11"
            >
              {mutation.pending ? (
                <LoaderCircleIcon
                  aria-hidden="true"
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <DownloadIcon aria-hidden="true" />
              )}
              {mutation.pending ? 'Готовим PDF…' : 'Скачать резюме PDF'}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent sideOffset={6} className="motion-reduce:animate-none">
          {profileExists && processing
            ? 'Скачать резюме с сохранёнными данными, навыками и достижениями.'
            : hint}
        </TooltipContent>
      </Tooltip>
      {(!profileExists || !processing) && (
        <p className="text-sm text-muted-foreground">{hint}</p>
      )}
      {mutation.error && (
        <FadeIn>
          <p role="alert" className="text-sm text-destructive">
            {mutation.error}
          </p>
        </FadeIn>
      )}
    </div>
  );
};
