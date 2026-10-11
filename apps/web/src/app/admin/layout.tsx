import type { ReactNode } from 'react';

import { AdminShell } from '@/widgets/admin-shell';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  return <AdminShell>{children}</AdminShell>;
};
export default AdminLayout;
