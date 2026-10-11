import Link from 'next/link';

import { Button } from '@/shared/ui';
import { adminOfferSchema } from '@/entities/admin';
import { AdminPanel, OperationStatus, useAdminQuery } from '@/features/admin';

import { adminDate, adminSalary } from '../lib';
import {
  AdminEntityLink,
  DescriptionPanel,
  DetailFields,
  OperationDetailsLayout,
} from './OperationDetailsLayout';

interface OfferDetailsProps {
  id: string;
}

export const OfferDetails = ({ id }: OfferDetailsProps) => {
  const query = useAdminQuery(`/offers/${id}`, adminOfferSchema);
  const offer = query.data;
  return (
    <OperationDetailsLayout
      section="offers"
      title={offer?.title}
      hasData={!!offer}
      loading={query.loading}
      error={query.error}
      onReload={query.reload}
    >
      {offer && (
        <>
          <AdminPanel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-medium">Условия предложения</h2>
              <OperationStatus value={offer.status} />
            </div>
            <DetailFields
              fields={[
                {
                  label: 'Компания на момент отправки',
                  value: (
                    <AdminEntityLink
                      section="companies"
                      id={offer.company_id}
                      label={offer.company_name}
                    />
                  ),
                },
                { label: 'ID профиля кандидата', value: offer.candidate_id },
                {
                  label: 'Потребность',
                  value: offer.need_id ? (
                    <AdminEntityLink section="needs" id={offer.need_id} />
                  ) : null,
                },
                {
                  label: 'Зарплата',
                  value: adminSalary(
                    offer.salary_from_rub,
                    offer.salary_to_rub,
                  ),
                },
                { label: 'Отправлено', value: adminDate(offer.created_at) },
                { label: 'Просмотрено', value: adminDate(offer.viewed_at) },
                {
                  label: 'Ответ получен',
                  value: adminDate(offer.responded_at),
                },
                {
                  label: 'Отправитель',
                  value: (
                    <AdminEntityLink section="users" id={offer.created_by} />
                  ),
                },
                { label: 'ID предложения', value: id },
              ]}
            />
            <p className="text-sm text-muted-foreground">
              Решение по предложению принимает кандидат.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href={`/admin/offers?candidate_id=${offer.candidate_id}`}>
                  Все предложения кандидату
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link
                  href={`/admin/attempts?candidate_id=${offer.candidate_id}`}
                >
                  Попытки тестирования
                </Link>
              </Button>
            </div>
          </AdminPanel>
          <DescriptionPanel text={offer.description} />
        </>
      )}
    </OperationDetailsLayout>
  );
};
