import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@/shared/ui';
import { adminCompanySchema } from '@/entities/admin';
import {
  AdminPanel,
  type OperationDecision,
  OperationDecisionDialog,
  OperationStatus,
  useAdminQuery,
} from '@/features/admin';

import { adminDate } from '../lib';
import { CompanyRelatedLists } from './CompanyRelatedLists';
import {
  DescriptionPanel,
  DetailFields,
  OperationDetailsLayout,
} from './OperationDetailsLayout';

export const CompanyDetails = ({ id }: { id: string }) => {
  const query = useAdminQuery(`/companies/${id}`, adminCompanySchema);
  const company = query.data;
  const [relatedRevision, setRelatedRevision] = useState(0);
  const refresh = () => {
    setRelatedRevision((value) => value + 1);
    query.reload();
  };
  const [decision, setDecision] = useState<OperationDecision | null>(null);
  const choose = (
    status: 'verified' | 'rejected' | 'unverified',
    title: string,
    description: string,
  ) => {
    if (company)
      setDecision({
        kind: 'companies',
        id,
        status,
        title,
        description,
        expectedVersion: company.verification_version,
      });
  };
  return (
    <OperationDetailsLayout
      section="companies"
      title={company?.name}
      hasData={!!company}
      loading={query.loading}
      error={query.error}
      onReload={refresh}
    >
      {company && (
        <>
          <AdminPanel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-medium">Проверка компании</h2>
              <OperationStatus value={company.verification_status} />
            </div>
            <DetailFields
              fields={[
                { label: 'ИНН', value: company.inn },
                { label: 'ID компании', value: id },
                { label: 'Создана', value: adminDate(company.created_at) },
                {
                  label: 'Заявка подана',
                  value: adminDate(company.verification_requested_at),
                },
                {
                  label: 'Решение принято',
                  value: adminDate(company.verification_reviewed_at),
                },
                {
                  label: 'Версия проверки',
                  value: company.verification_version,
                },
                {
                  label: 'Администратор проверки',
                  value: company.verification_reviewed_by,
                },
                { label: 'Почта компании', value: company.contact_email },
                {
                  label: 'Сайт / контактная ссылка',
                  value: company.contact_url,
                },
              ]}
            />
            {company.verification_reason && (
              <p className="whitespace-pre-wrap text-sm">
                Причина решения: {company.verification_reason}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {company.verification_status === 'pending' && (
                <>
                  <Button
                    onClick={() =>
                      choose(
                        'verified',
                        'Подтвердить компанию',
                        'Проверьте реквизиты и документы заявки. Компания получит статус подтверждённой.',
                      )
                    }
                  >
                    Подтвердить
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      choose(
                        'rejected',
                        'Отклонить заявку',
                        'Укажите причину отказа. Владелец сможет подать новую заявку после исправлений.',
                      )
                    }
                  >
                    Отклонить
                  </Button>
                </>
              )}
              {company.verification_status === 'verified' && (
                <Button
                  variant="destructive"
                  onClick={() =>
                    choose(
                      'unverified',
                      'Отозвать подтверждение',
                      'Компания потеряет подтверждение. История проверки сохранится в журнале.',
                    )
                  }
                >
                  Отозвать подтверждение
                </Button>
              )}
            </div>
            {company.verification_status === 'unverified' && (
              <p className="text-sm text-muted-foreground">
                Компания ещё не подала заявку на подтверждение.
              </p>
            )}
          </AdminPanel>
          <DescriptionPanel text={company.description} />
          <AdminPanel>
            <h2 className="font-medium">Деятельность компании</h2>
            <div className="flex flex-wrap gap-2">
              {[
                ['needs', 'Потребности'],
                ['offers', 'Предложения'],
                ['tasks', 'Задания'],
              ].map(([section, label]) => (
                <Button key={section} variant="outline" asChild>
                  <Link href={`/admin/${section}?company_id=${id}`}>
                    {label}
                  </Link>
                </Button>
              ))}
              <Button variant="outline" asChild>
                <Link href={`/admin/audit?entity_id=${id}`}>
                  История проверки
                </Link>
              </Button>
            </div>
          </AdminPanel>
          <CompanyRelatedLists
            key={`${id}:${company.verification_version}:${relatedRevision}`}
            company={company}
          />
        </>
      )}
      {decision && (
        <OperationDecisionDialog
          decision={decision}
          onClose={() => setDecision(null)}
          onSaved={refresh}
          onRefresh={refresh}
        />
      )}
    </OperationDetailsLayout>
  );
};
