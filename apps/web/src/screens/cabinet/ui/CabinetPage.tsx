import { redirect } from 'next/navigation';

import { STATIC_ROUTES } from '@/shared/contants';
import { getRoleHomeRoute } from '@/entities/session';
import { requireSessionUser } from '@/entities/session/api/server';

export const CabinetPage = async () => {
  const user = await requireSessionUser(STATIC_ROUTES.CABINET);

  if (!user.role) {
    redirect(STATIC_ROUTES.LOGIN);
  }

  redirect(getRoleHomeRoute(user.role));
};
