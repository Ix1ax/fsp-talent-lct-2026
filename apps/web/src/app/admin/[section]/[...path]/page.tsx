import { notFound } from 'next/navigation';

import { AdminWorkspacePage } from '@/screens/admin';

const AdminItemPage = async ({
  params,
}: {
  params: Promise<{ section: string; path: string[] }>;
}) => {
  const { section, path } = await params;
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
