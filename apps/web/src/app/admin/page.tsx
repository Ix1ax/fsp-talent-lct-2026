import { redirect } from 'next/navigation';

import { DYNAMIC_ROUTES } from '@/shared/contants';

// Стартовый экран админки — обзор платформы.
const AdminPage = () => {
  return redirect(DYNAMIC_ROUTES.ADMIN('overview'));
};

export default AdminPage;
