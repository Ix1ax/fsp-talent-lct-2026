import type { ReactNode } from 'react';

import { AdminShell } from '@/widgets/admin-shell';

const AdminLayout = ({ children }: { children: ReactNode }) => (
  <AdminShell>{children}</AdminShell>
);
export default AdminLayout;
