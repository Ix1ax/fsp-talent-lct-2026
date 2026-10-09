import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import {
  AccountsPage,
  CatalogsPage,
  ModerationPage,
  QuestionsPage,
  TemplatesPage,
} from '@/screens/admin';

const pages = {
  catalogs: CatalogsPage,
  moderation: ModerationPage,
  questions: QuestionsPage,
  templates: TemplatesPage,
  admins: AccountsPage,
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
  if (!isAdminSection(section)) notFound();
  const Page = pages[section];
  return (
    <Suspense fallback={<p role="status">Загружаем раздел…</p>}>
      <Page />
    </Suspense>
  );
};
export default AdminSectionPage;
