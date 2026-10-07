import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import type { AvailableAssessment } from '@/entities/assessment';

interface StartAssessmentDialogProps {
  test?: AvailableAssessment;
  busy: boolean;
  onClose: () => void;
  onStart: () => Promise<void>;
}

export const StartAssessmentDialog = ({
  test,
  busy,
  onClose,
  onStart,
}: StartAssessmentDialogProps) => {
  return (
    <Dialog
      open={!!test}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Начать тест?</DialogTitle>
          <DialogDescription>
            Таймер запустится сразу. На выполнение —{' '}
            {Math.ceil((test?.timeLimitSec ?? 0) / 60)} мин. Одновременно можно
            проходить только один тест.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
          <Button disabled={busy} onClick={() => void onStart()}>
            {busy ? 'Запускаем…' : 'Начать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
