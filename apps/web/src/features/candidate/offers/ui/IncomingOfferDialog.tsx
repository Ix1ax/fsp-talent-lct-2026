import { useCallback, useEffect, useState } from 'react';
import { CheckIcon, LinkIcon, MailIcon } from 'lucide-react';

import { ApiError } from '@/shared/api/errors';
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import { useAsyncMutation, useRemoteData } from '@/shared/hooks';
import { launchConfetti } from '@/shared/lib/launchConfetti';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  RemoteState,
  toast,
} from '@/shared/ui';
import { formatSalaryRange } from '@/shared/utils';
import {
  getIncomingOffer,
  type IncomingOffer,
  type OfferDecision,
  respondToIncomingOffer,
  viewIncomingOffer,
} from '@/entities/candidate-offers';

import { OfferStatusBadge } from './OfferStatusBadge';

interface IncomingOfferDialogProps {
  id: string;
  onClose: () => void;
  onUpdate: (offer: IncomingOffer) => void;
  onCloseAutoFocus: (event: Event) => void;
}

export const IncomingOfferDialog = ({
  id,
  onClose,
  onUpdate,
  onCloseAutoFocus,
}: IncomingOfferDialogProps) => {
  const [saved, setSaved] = useState<IncomingOffer>();
  const [viewRevision, setViewRevision] = useState(0);

  const load = useCallback(
    (signal: AbortSignal) => getIncomingOffer(id, signal),
    [id],
  );
  const detail = useRemoteData(load);
  const viewLoad = useCallback(
    async (signal: AbortSignal) => {
      const result = await viewIncomingOffer(id, signal);
      return result;
    },
    [id],
  );

  const viewed = useRemoteData(viewLoad, viewRevision, !!detail.data);
  const offer = saved ?? viewed.data ?? detail.data;

  useEffect(() => {
    if (viewed.data) onUpdate(viewed.data);
  }, [viewed.data, onUpdate]);

  const mutation = useAsyncMutation();

  const respond = (status: OfferDecision) => {
    void mutation
      .run(async () => {
        try {
          const updated = await respondToIncomingOffer(id, status);

          setSaved(updated);
          onUpdate(updated);
          onClose();
          if (updated.status === 'accepted') {
            launchConfetti();
            toast.success(
              'Предложение принято! Работодатель увидит ваш ответ.',
            );
          }
        } catch (error) {
          if (error instanceof ApiError && error.code === 'response_conflict') {
            const current = await getIncomingOffer(id);
            setSaved(current);
            setViewRevision((value) => value + 1);
            onUpdate(current);
          }

          throw error;
        }
      })
      .catch((error: unknown) => {
        toast.error(getApiErrorMessage(error));
      });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.pending) onClose();
      }}
    >
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"
        showCloseButton={!mutation.pending}
      >
        <DialogHeader>
          <DialogTitle>{offer?.title ?? 'Предложение'}</DialogTitle>
          <DialogDescription>
            Условия работодателя. После ответа изменить решение нельзя.
          </DialogDescription>
        </DialogHeader>
        <RemoteState {...detail} />
        {offer && (
          <div className="grid gap-5 wrap-anywhere">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium">{offer.companyName}</p>
              <OfferStatusBadge status={offer.status} />
            </div>
            <div className="rounded-xl border border-primary/25 bg-linear-to-br from-primary/12 via-card to-(--brand-red)/6 p-4">
              <p className="text-xs text-muted-foreground">Зарплата</p>
              <p className="mt-1 text-2xl font-semibold text-brand-text tabular-nums">
                {formatSalaryRange(offer.salaryFromRub, offer.salaryToRub)}
              </p>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {offer.description}
            </p>
            <div className="grid gap-2 rounded-xl bg-muted/60 p-4 text-sm">
              <p className="text-xs text-muted-foreground">
                Контакты работодателя
              </p>
              <a
                href={`mailto:${offer.contactEmail}`}
                className="flex items-center gap-2 text-brand-text underline-offset-4 hover:underline"
              >
                <MailIcon aria-hidden="true" className="size-4 shrink-0" />
                {offer.contactEmail}
              </a>
              {offer.contactUrl && (
                <p className="flex items-center gap-2">
                  <LinkIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  {offer.contactUrl}
                </p>
              )}
            </div>
            {viewed.error && (
              <div className="grid gap-2">
                <p role="alert" className="text-sm text-destructive">
                  Не удалось отметить просмотр: {viewed.error}
                </p>
                <Button variant="outline" onClick={viewed.retry}>
                  Повторить отметку просмотра
                </Button>
              </div>
            )}
            {(offer.status === 'sent' || offer.status === 'viewed') && (
              <>
                <p className="text-sm text-muted-foreground">
                  Принятие предложения сохраняет ваш ответ работодателю.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="max-sm:flex-1"
                    disabled={mutation.pending || detail.loading}
                    onClick={() => respond('accepted')}
                  >
                    <CheckIcon aria-hidden="true" />
                    Принять предложение
                  </Button>
                  <Button
                    variant="outline"
                    className="max-sm:flex-1"
                    disabled={mutation.pending || detail.loading}
                    onClick={() => respond('rejected')}
                  >
                    Отклонить
                  </Button>
                </div>
              </>
            )}
            {mutation.error && (
              <p role="alert" className="text-sm text-destructive">
                {mutation.error}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
