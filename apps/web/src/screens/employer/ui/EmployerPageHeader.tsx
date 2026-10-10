import { PageHeader } from '@/shared/ui';
import { CompanySwitcher } from '@/widgets/employer-shell';

import { EMPLOYER_SECTIONS, type EmployerSection } from '../constants';
import type { EmployerBoard, EmployerWorkspace } from '../model';

const getEmployerPageTitle = (
  createCompany: boolean,
  section: EmployerSection,
  selectedSection: (typeof EMPLOYER_SECTIONS)[number] | undefined,
) => {
  if (createCompany) {
    return 'Создание компании';
  }

  if (section === 'overview') {
    return 'Компании';
  }

  if (section === 'invitation') {
    return 'Приглашение в компанию';
  }

  return selectedSection?.title;
};

const MEMBER_ROLE_LABELS = {
  owner: 'владелец',
  recruiter: 'рекрутер',
  viewer: 'наблюдатель',
} as const;

interface EmployerPageHeaderProps {
  section: EmployerSection;
  board: EmployerBoard;
  workspace: EmployerWorkspace;
}

export const EmployerPageHeader = ({
  section,
  board,
  workspace,
}: EmployerPageHeaderProps) => {
  const {
    createCompany,
    busy,
    guard,
    setCreateCompany,
    setComposer,
    setCandidateId,
    navigate,
    startCompany,
  } = workspace;
  const selectedSection = EMPLOYER_SECTIONS.find((item) => item.id === section);
  const company = board.company;
  const centered =
    createCompany ||
    section === 'invitation' ||
    (!!board.resources && !company);

  const companySwitcher = board.resources && (
    <CompanySwitcher
      companies={board.resources.companies}
      company={company}
      pending={busy}
      onCompany={(id) =>
        guard(() => {
          setCreateCompany(false);
          setComposer(false);
          setCandidateId('');
          board.chooseCompany(id);
        })
      }
      onSettings={() => navigate('profile')}
      onCreateCompany={startCompany}
    />
  );

  return (
    <PageHeader>
      <PageHeader.Row>
        <PageHeader.Content>
          <PageHeader.Title>
            {getEmployerPageTitle(createCompany, section, selectedSection)}
          </PageHeader.Title>
          <PageHeader.Description>
            {section === 'overview'
              ? 'Ваши компании и команды. Выберите компанию, чтобы работать с её профилем, сотрудниками и потребностями.'
              : selectedSection?.description}
          </PageHeader.Description>
        </PageHeader.Content>
        <PageHeader.Actions>
          {board.resources &&
          board.resources.companies.length > 0 &&
          !centered &&
          section !== 'overview' ? (
            <div className="flex w-full min-w-0 flex-col gap-1.5 lg:w-72">
              <span className="text-xs text-muted-foreground">
                Компания
                {company && ` · ${MEMBER_ROLE_LABELS[company.memberRole]}`}
              </span>
              {companySwitcher}
            </div>
          ) : undefined}
        </PageHeader.Actions>
      </PageHeader.Row>
    </PageHeader>
  );
};
