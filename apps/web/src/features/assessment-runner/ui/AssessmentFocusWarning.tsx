import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';

interface AssessmentFocusWarningProps {
  violations: number;
}

export const AssessmentFocusWarning = ({
  violations,
}: AssessmentFocusWarningProps) => {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <Dialog
      open={violations === 1 && !acknowledged}
      onOpenChange={(open) => {
        if (!open) setAcknowledged(true);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Не покидайте вкладку теста</DialogTitle>
          <DialogDescription>
            Зафиксирован первый уход со страницы. При повторном переключении
            вкладки или окна тест завершится автоматически по сохранённым
            ответам. Таймер продолжает идти.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setAcknowledged(true)}>Продолжить тест</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
