import { redirect } from 'next/navigation';

import { DYNAMIC_ROUTES, LEGAL_DOCUMENTS } from '@/shared/contants';

export default function Page() {
  redirect(DYNAMIC_ROUTES.LEGAL(LEGAL_DOCUMENTS[0].slug));
}
