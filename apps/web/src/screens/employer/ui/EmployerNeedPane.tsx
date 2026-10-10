import { ArrowLeftIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import type { Catalogs } from '@/entities/catalog';

import type { EmployerGateway } from '../lib';
import type { EmployerBoard } from '../model';
import { EmployerNeedContent } from './EmployerNeedContent';

interface EmployerNeedPaneProps {
  board: EmployerBoard;
  catalogs: Catalogs;
  loadSkills: EmployerGateway['skills'];
  canWrite: boolean;
  composer: boolean;
  detail: boolean;
  dirty: boolean;
  showMatches: boolean;
  loadRecommendations?: EmployerGateway['recommendations'];
  onDirtyChange: (dirty: boolean) => void;
  onCreated: (active: boolean) => void;
  onSaved: () => void;
  onCancelCreate: () => void;
  onBack: () => void;
  onFind: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
  onStartCreate: () => void;
}

export const EmployerNeedPane = ({
  board,
  catalogs,
  loadSkills,
  canWrite,
  composer,
  detail,
  dirty,
  showMatches,
  loadRecommendations,
  onDirtyChange,
  onCreated,
  onSaved,
  onCancelCreate,
  onBack,
  onFind,
  onArchive,
  onDuplicate,
  onStartCreate,
}: EmployerNeedPaneProps) => {
  return (
    <main
      className={cn(
        'min-w-0 space-y-5 pb-6 md:p-6 xl:px-8',
        !detail && 'max-md:hidden',
      )}
    >
      {detail && (
        <Button
          variant="ghost"
          className="h-12 w-full justify-start border-b border-border bg-card md:hidden"
          onClick={onBack}
        >
          <ArrowLeftIcon />
          Потребности
        </Button>
      )}
      <EmployerNeedContent
        board={board}
        catalogs={catalogs}
        loadSkills={loadSkills}
        canWrite={canWrite}
        composer={composer}
        detail={detail}
        dirty={dirty}
        showMatches={showMatches}
        loadRecommendations={loadRecommendations}
        onDirtyChange={onDirtyChange}
        onCreated={onCreated}
        onSaved={onSaved}
        onCancelCreate={onCancelCreate}
        onFind={onFind}
        onArchive={onArchive}
        onDuplicate={onDuplicate}
        onStartCreate={onStartCreate}
      />
    </main>
  );
};
