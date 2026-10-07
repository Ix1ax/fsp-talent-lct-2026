import { useState } from 'react';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '@/shared/ui';

import { CONSENT_LABELS, CONSENT_PLACEHOLDER_TEXT } from '../constants';

interface ConsentGrantDialogProps {
  kind: 'processing' | 'publication';
  policyVersion: string;
  busy: boolean;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}

export const ConsentGrantDialog = ({
  kind,
  policyVersion,
  busy,
  onConfirm,
  onClose,
}: ConsentGrantDialogProps) => {
  const [checked, setChecked] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{CONSENT_LABELS[kind]}</DialogTitle>
          <DialogDescription>
            Версия политики: {policyVersion}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Временный текст согласия для прототипа. Позже он будет заменён
          утверждённой политикой.
        </p>
        <p className="text-sm">{CONSENT_PLACEHOLDER_TEXT[kind]}</p>
        <Label className="items-start leading-normal">
          <Checkbox
            checked={checked}
            disabled={busy}
            onCheckedChange={(value) => setChecked(value === true)}
            className="mt-0.5"
          />
          Я ознакомился с текстом и даю согласие по версии {policyVersion}.
        </Label>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          <Button
            disabled={!checked || busy || !policyVersion}
            onClick={async () => {
              if (await onConfirm()) onClose();
            }}
          >
            Дать согласие
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
