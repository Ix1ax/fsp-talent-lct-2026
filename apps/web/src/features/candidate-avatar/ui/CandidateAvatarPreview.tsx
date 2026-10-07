import { useEffect, useState } from 'react';
import { isCancel } from 'axios';

import { Avatar, AvatarFallback, AvatarImage, Button } from '@/shared/ui';
import { getCandidateAvatar } from '@/entities/candidate-profile';

import { getAvatarError } from '../lib/getAvatarError';
import { AvatarAction } from './AvatarAction';

interface CandidateAvatarPreviewProps {
  hasAvatar: boolean;
  busy: boolean;
  onRetry: () => void;
  onAction: () => void;
}
export const CandidateAvatarPreview = ({
  hasAvatar,
  busy,
  onRetry,
  onAction,
}: CandidateAvatarPreviewProps) => {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(hasAvatar);

  useEffect(() => {
    if (!hasAvatar) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void getCandidateAvatar(controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((error) => {
        if (!controller.signal.aborted && !isCancel(error))
          setError(getAvatarError(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasAvatar]);

  return (
    <div className="flex flex-col gap-3" aria-busy={loading}>
      <AvatarAction
        label={
          hasAvatar ? 'Редактировать фото профиля' : 'Добавить фото профиля'
        }
        disabled={busy || loading}
        onClick={onAction}
      >
        <Avatar className="size-24">
          <AvatarImage src={url} alt="Ваш аватар" />
          <AvatarFallback>
            <span className="text-xs">
              {hasAvatar ? 'Фото' : 'Добавить фото'}
            </span>
          </AvatarFallback>
        </Avatar>
      </AvatarAction>
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Загрузка аватара…
        </p>
      )}
      {error && (
        <>
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="self-start"
            onClick={onRetry}
          >
            Повторить загрузку изображения
          </Button>
        </>
      )}
    </div>
  );
};
