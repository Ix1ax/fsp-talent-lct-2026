import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { isOperationSection } from '@/features/admin/server';
import {
  AccountsPage,
  AuditPage,
  CatalogsPage,
  ModerationPage,
  OperationsPage,
  QuestionsPage,
  StatisticsPage,
  TemplatesPage,
} from '@/screens/admin';

const pages = {
  catalogs: CatalogsPage,
  moderation: ModerationPage,
  questions: QuestionsPage,
  templates: TemplatesPage,
  admins: AccountsPage,
  overview: StatisticsPage,
  audit: AuditPage,
};
type AdminSection = keyof typeof pages;
const isAdminSection = (section: string): section is AdminSection =>
  Object.prototype.hasOwnProperty.call(pages, section);
const AdminSectionPage = async ({
  params,
}: {
  params: Promise<{ section: string }>;
}) => {
  const { section } = await params;
  if (isOperationSection(section))
    return (
      <Suspense fallback={<p role="status">Загружаем раздел…</p>}>
        <OperationsPage section={section} />
      </Suspense>
    );
  if (!isAdminSection(section)) notFound();
  const Page = pages[section];
  return (
    <Suspense fallback={<p role="status">Загружаем раздел…</p>}>
      <Page />
    </Suspense>
  );
};
export default AdminSectionPage;
