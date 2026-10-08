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
const AdminSectionPage = async ({
  params,
}: {
  params: Promise<{ section: string }>;
}) => {
  const { section } = await params;
  if (!(section in pages)) notFound();
  const Page = pages[section as keyof typeof pages];
  return (
    <Suspense fallback={<p role="status">Загружаем раздел…</p>}>
      <Page />
    </Suspense>
  );
};
export default AdminSectionPage;
