import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import type { RevokeConsentInput } from '@/entities/candidate';

import { CONSENT_LABELS, CONSENT_REVOCATION_TEXT } from '../constants';

interface ConsentRevokeDialogProps {
  input: RevokeConsentInput;
  busy: boolean;
  error?: string;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}

export const ConsentRevokeDialog = ({
  input,
  busy,
  error,
  onConfirm,
  onClose,
}: ConsentRevokeDialogProps) => {
  const [attempted, setAttempted] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Отозвать согласие?</DialogTitle>
          <DialogDescription>{CONSENT_LABELS[input.kind]}</DialogDescription>
        </DialogHeader>
        <p className="text-sm">{CONSENT_REVOCATION_TEXT[input.kind]}</p>
        {input.kind !== 'ats_transfer' && (
          <p className="text-sm text-muted-foreground">
            Повторная выдача согласия не восстановит публикацию автоматически.
          </p>
        )}
        <p role="alert" className="min-h-5 text-sm text-destructive">
          {attempted && error}
        </p>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setAttempted(true);
              if (await onConfirm()) onClose();
            }}
          >
            Отозвать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
import { useState } from 'react';
