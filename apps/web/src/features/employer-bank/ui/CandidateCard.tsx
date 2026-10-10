import { Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui';
import type { Catalogs } from '@/entities/catalog';
import type { BankCandidate } from '@/entities/employer-bank';

import { CandidateSummary } from './CandidateSummary';

interface CandidateCardProps {
  candidate: BankCandidate;
  catalogs: Catalogs;
  onOpen: () => void;
}
export const CandidateCard = ({
  candidate,
  catalogs,
  onOpen,
}: CandidateCardProps) => {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Кандидат · {candidate.id.slice(0, 8)}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <CandidateSummary candidate={candidate} catalogs={catalogs} />
        <Button
          variant="outline"
          onClick={onOpen}
          className="justify-self-start"
        >
          Открыть профиль
        </Button>
      </CardContent>
    </Card>
  );
};
