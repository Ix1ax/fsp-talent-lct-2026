import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@/shared/ui';
import {
  type OperationDecision,
  OperationDecisionDialog,
} from '@/features/admin';

interface ContentModerationActionsProps {
  section: 'needs' | 'tasks';
  id: string;
  title: string;
  hidden: boolean;
  onSaved: () => void;
}
export const ContentModerationActions = ({
  section,
  id,
  title,
  hidden,
  onSaved,
}: ContentModerationActionsProps) => {
  const [decision, setDecision] = useState<OperationDecision | null>(null);
  const choose = () =>
    setDecision({
      kind: section,
      id,
      subjectLabel: title,
      status: hidden ? 'published' : 'hidden',
      title: hidden ? 'Снять модерацию' : 'Скрыть публикацию',
      description:
        section === 'needs'
          ? 'Потребность останется в архиве. После снятия модерации работодатель сможет обновить и активировать её.'
          : 'Приём решений будет закрыт. Снятие модерации не откроет приём снова и не вернёт дневную квоту публикации.',
    });
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant={hidden ? 'default' : 'destructive'} onClick={choose}>
          {hidden ? 'Снять модерацию' : 'Скрыть'}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/admin/audit?entity_id=${id}`}>История модерации</Link>
        </Button>
      </div>
      {decision && (
        <OperationDecisionDialog
          decision={decision}
          onClose={() => setDecision(null)}
          onSaved={onSaved}
          onRefresh={onSaved}
        />
      )}
    </>
  );
};
