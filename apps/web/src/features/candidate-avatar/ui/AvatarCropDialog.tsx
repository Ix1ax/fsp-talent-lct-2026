'use client';

import { useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/ui';
import { toast } from '@/shared/ui/Sonner';

import { cropAvatar } from '../lib/cropAvatar';
import { avatarSchema } from '../model/avatarSchema';

interface AvatarCropDialogProps {
  file: File;
  onApply: (file: File) => void;
  onCancel: () => void;
}

export const AvatarCropDialog = ({
  file,
  onApply,
  onCancel,
}: AvatarCropDialogProps) => {
  const [url, setUrl] = useState<string>();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area>();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const applying = useRef(false);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const frame = requestAnimationFrame(() => setUrl(objectUrl));
    return () => {
      cancelAnimationFrame(frame);
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const reportError = (message: string) => {
    setError(message);
    toast.error(message);
  };

  const apply = async () => {
    if (!area || applying.current) return;
    applying.current = true;
    setProcessing(true);
    setError('');
    try {
      const result = await cropAvatar(file, area, rotation);
      const validation = await avatarSchema.safeParseAsync({ file: result });
      if (!validation.success) {
        reportError(validation.error.issues[0].message);
        return;
      }
      onApply(result);
    } catch (error) {
      reportError(
        error instanceof Error
          ? error.message
          : 'Не удалось обработать фото. Попробуйте ещё раз.',
      );
    } finally {
      applying.current = false;
      setProcessing(false);
    }
  };

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setError('');
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !processing) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={!processing}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-xl data-open:animate-none"
      >
        <DialogHeader>
          <DialogTitle>Редактирование фото</DialogTitle>
          <DialogDescription>
            Перемещайте фото, чтобы выбрать область аватара. Масштаб и поворот
            можно изменить ниже.
          </DialogDescription>
        </DialogHeader>
        <div
          className="relative h-64 overflow-hidden rounded-lg bg-muted sm:h-80"
          aria-label="Область обрезки фото"
        >
          {url && (
            <Cropper
              image={url}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              minZoom={1}
              maxZoom={3}
              cropShape="rect"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropAreaChange={(_, pixels) => setArea(pixels)}
              cropperProps={{
                'aria-label': 'Переместить область обрезки стрелками',
                'aria-disabled': processing,
              }}
              onTouchRequest={() => !processing}
              onWheelRequest={() => !processing}
            />
          )}
          {processing && (
            <div className="absolute inset-0 z-10 bg-background/50" />
          )}
        </div>
        <fieldset disabled={processing} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="avatar-zoom" className="text-sm font-medium">
              Масштаб: {zoom.toFixed(1)}×
            </label>
            <Input
              id="avatar-zoom"
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="avatar-rotation" className="text-sm font-medium">
              Поворот: {Math.round(rotation)}°
            </label>
            <Input
              id="avatar-rotation"
              type="range"
              min={0}
              max={360}
              step={1}
              value={rotation}
              onChange={(event) => setRotation(Number(event.target.value))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRotation((previous) => (previous + 270) % 360)}
            >
              Повернуть −90°
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRotation((previous) => (previous + 90) % 360)}
            >
              Повернуть +90°
            </Button>
            <Button type="button" variant="outline" onClick={reset}>
              Сбросить
            </Button>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {processing && (
          <p role="status" className="text-sm text-muted-foreground">
            Обработка фото…
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={processing}
            onClick={onCancel}
          >
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!area || processing}
            onClick={() => void apply()}
          >
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
