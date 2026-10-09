import { useCallback, useState } from 'react';

import { ApiError } from '@/shared/api/errors';
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage';
import { useAsyncMutation, useRemoteData } from '@/shared/hooks';
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
  onUpdate: () => void;
}

export const IncomingOfferDialog = ({
  id,
  onClose,
  onUpdate,
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
  const mutation = useAsyncMutation();

  const respond = (status: OfferDecision) => {
    void mutation
      .run(async () => {
        try {
          setSaved(await respondToIncomingOffer(id, status));
          onUpdate();
          onClose();
        } catch (error) {
          if (error instanceof ApiError && error.code === 'response_conflict') {
            setSaved(await getIncomingOffer(id));
            setViewRevision((value) => value + 1);
            onUpdate();
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
          <div className="grid gap-4 wrap-anywhere">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium">{offer.companyName}</p>
              <OfferStatusBadge status={offer.status} />
            </div>
            <p className="whitespace-pre-wrap text-sm">{offer.description}</p>
            <p className="font-medium">
              {formatSalaryRange(offer.salaryFromRub, offer.salaryToRub)}
            </p>
            <p className="text-sm">
              Контакт работодателя: {offer.contactEmail}
            </p>
            {offer.contactUrl && <p className="text-sm">{offer.contactUrl}</p>}
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
                    disabled={mutation.pending || detail.loading}
                    onClick={() => respond('accepted')}
                  >
                    Принять предложение
                  </Button>
                  <Button
                    variant="outline"
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
