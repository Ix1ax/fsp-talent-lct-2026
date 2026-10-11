import { CandidateDetails, OfferComposer } from '@/features/employer-bank';

import type { EmployerSection } from '../constants';
import type { employerGateway } from '../lib';
import type { EmployerBoard, EmployerWorkspace } from '../model';

interface EmployerCandidateDialogsProps {
  section: EmployerSection;
  board: EmployerBoard;
  workspace: EmployerWorkspace;
  api: typeof employerGateway;
}

export const EmployerCandidateDialogs = ({
  section,
  board,
  workspace,
  api,
}: EmployerCandidateDialogsProps) => {
  const company = board.company;
  const { candidateId, offer, busy, setCandidateId, setOffer, busyChanged } =
    workspace;
  return (
    <>
      {company && board.resources && candidateId && !offer && (
        <CandidateDetails
          company={company}
          catalogs={board.catalogs}
          candidateId={candidateId}
          api={api}
          busy={busy}
          onClose={() => setCandidateId('')}
          onViewed={board.reload}
          onOffer={() => setOffer(true)}
        />
      )}
      {company && candidateId && offer && (
        <OfferComposer
          company={company}
          candidateId={candidateId}
          need={
            section === 'vacancies' && board.selected?.status === 'active'
              ? board.selected
              : undefined
          }
          api={api}
          onBusyChange={busyChanged}
          onClose={() => setOffer(false)}
          onSent={() => {
            setOffer(false);
            setCandidateId('');
            board.reload();
          }}
        />
      )}
    </>
  );
};
