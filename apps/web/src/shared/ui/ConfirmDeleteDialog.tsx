import { Button } from './Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './Dialog';

interface ConfirmDeleteDialogProps {
  title: string;
  description: string;
  busy: boolean;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}
export const ConfirmDeleteDialog = ({
  title,
  description,
  busy,
  onConfirm,
  onClose,
}: ConfirmDeleteDialogProps) => {
  const confirm = async () => {
    if (busy) return;
    if (await onConfirm()) onClose();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? 'Удаление…' : 'Удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
