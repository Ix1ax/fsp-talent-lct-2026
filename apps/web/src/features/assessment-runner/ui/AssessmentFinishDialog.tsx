import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';

interface AssessmentFinishDialogProps {
  confirm: boolean;
  locked: boolean;
  busy: boolean;
  reviewing: boolean;
  unanswered: number;
  error: string;
  setConfirm: (open: boolean) => void;
  finish: () => Promise<boolean>;
}
export const AssessmentFinishDialog = ({
  confirm,
  locked,
  busy,
  reviewing,
  unanswered,
  error,
  setConfirm,
  finish,
}: AssessmentFinishDialogProps) => {
  return (
    <Dialog
      open={confirm && !locked}
      onOpenChange={(open) => {
        if (!busy) setConfirm(open);
      }}
    >
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>
            {reviewing ? 'Завершить тест?' : 'Завершить тест досрочно?'}
          </DialogTitle>
          <DialogDescription>
            Без ответа: {unanswered}. Перед завершением отправим все текущие
            ответы. После отправки изменить их нельзя.
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            Отмена
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              void finish().then((done) => {
                if (done) setConfirm(false);
              });
            }}
          >
            {busy ? 'Отправляем…' : 'Завершить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
