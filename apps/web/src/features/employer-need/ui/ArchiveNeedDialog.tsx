import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
interface ArchiveNeedDialogProps {
  open: boolean;
  pending: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}
export const ArchiveNeedDialog = ({
  open,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: ArchiveNeedDialogProps) => (
  <Dialog
    open={open}
    onOpenChange={(v) => {
      if (!pending) onOpenChange(v);
    }}
  >
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Перенести потребность в архив?</DialogTitle>
        <DialogDescription>
          Условия сохранятся. Вернуть потребность можно через вкладку «Архив».
        </DialogDescription>
      </DialogHeader>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => onOpenChange(false)}
        >
          Отмена
        </Button>
        <Button
          disabled={pending}
          onClick={() => {
            void onConfirm()
              .then(() => onOpenChange(false))
              .catch(() => {});
          }}
        >
          {pending ? 'Сохраняем…' : 'В архив'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
