import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
interface ConfirmDiscardDialogProps {
  open: boolean;
  onCancel: () => void;
  onProceed: () => void;
}
export const ConfirmDiscardDialog = ({
  open,
  onCancel,
  onProceed,
}: ConfirmDiscardDialogProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
    >
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>Есть несохранённые изменения</DialogTitle>
          <DialogDescription>
            При переходе введённые изменения будут потеряны. Можно остаться и
            сохранить их.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Остаться
          </Button>
          <Button onClick={onProceed}>Перейти без сохранения</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
