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
import type { Catalogs, Skill } from '@/entities/catalog';

import { getAssessmentTitle } from '../lib';

interface StartAssessmentDialogProps {
  test?: AvailableAssessment;
  catalogs?: Catalogs;
  skills?: Skill[];
  busy: boolean;
  onClose: () => void;
  onStart: () => Promise<void>;
}

export const StartAssessmentDialog = ({
  test,
  catalogs,
  skills = [],
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
          {test && (
            <p className="text-sm font-medium">
              {getAssessmentTitle(test, catalogs, skills)}
            </p>
          )}
          <DialogDescription>
            Таймер запустится сразу. На выполнение —{' '}
            {Math.ceil((test?.timeLimitSec ?? 0) / 60)} мин. Одновременно можно
            проходить только один тест. Первый уход из вкладки — предупреждение,
            второй — автоматическое завершение теста.
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
