import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';

import { getAllSkills, getCatalogs } from '@/entities/catalog/api/server';
import { GuidesPage } from '@/screens/guides';

export const metadata: Metadata = {
  title: 'Справочник · ФСП Скаут',
};

// Справочники меняются редко: данные кешируются на час (как ISR), но страница
// не пререндерится при сборке — в Docker API на этом шаге недоступен, и ошибка
// закешировалась бы на час. Неудачный запрос не кешируется. Поиск навыков —
// фильтр полного списка в браузере.
export const dynamic = 'force-dynamic';

const getGuidesData = unstable_cache(
  async () => {
    const [catalogs, skills] = await Promise.all([
      getCatalogs(),
      getAllSkills({}),
    ]);
    return { catalogs, skills };
  },
  ['guides-catalogs-and-skills'],
  { revalidate: 3600 },
);

const Page = async () => {
  const data = await getGuidesData().catch(() => null);

  return <GuidesPage catalogs={data?.catalogs} skills={data?.skills} />;
};

export default Page;
