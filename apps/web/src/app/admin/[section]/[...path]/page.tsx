import { notFound } from 'next/navigation';
import { z } from 'zod';

import { isOperationSection } from '@/features/admin/server';
import { AdminWorkspacePage, OperationDetailsPage } from '@/screens/admin';

const AdminItemPage = async ({
  params,
}: {
  params: Promise<{ section: string; path: string[] }>;
}) => {
  const { section, path } = await params;
  if (isOperationSection(section)) {
    if (path.length !== 1 || !z.uuid().safeParse(path[0]).success) notFound();
    return <OperationDetailsPage section={section} id={path[0]} />;
  }
  if (section !== 'templates' && section !== 'questions') notFound();
  const [id, action] = path;
  if (
    !id ||
    path.length > 2 ||
    (action && action !== 'edit' && action !== 'preview') ||
    (action === 'preview' && section !== 'templates') ||
    (id === 'new' && action)
  )
    notFound();
  return (
    <AdminWorkspacePage
      section={section}
      id={id}
      action={action as 'edit' | 'preview' | undefined}
    />
  );
};
export default AdminItemPage;
