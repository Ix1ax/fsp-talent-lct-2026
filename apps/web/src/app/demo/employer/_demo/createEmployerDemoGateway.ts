import type { Catalogs, Skill } from '@/entities/catalog';
import type { Company } from '@/entities/company';
import type { EmployerNeed } from '@/entities/employer-need';
import type { EmployerGateway } from '@/screens/employer';

// Вымышленные данные для демонстрации: записи живут только в памяти этой вкладки.
export const createEmployerDemoGateway = (
  scenario = 'filled',
): EmployerGateway => {
  const catalogs: Catalogs = {
    specializations: [
      { id: 1, code: 'frontend', name: 'Frontend' },
      { id: 2, code: 'backend', name: 'Backend' },
      { id: 3, code: 'qa', name: 'QA' },
      { id: 4, code: 'data', name: 'Data' },
    ],
    grades: [
      { id: 1, code: 'junior', name: 'Junior', rank: 1 },
      { id: 2, code: 'middle', name: 'Middle', rank: 2 },
      { id: 3, code: 'senior', name: 'Senior', rank: 3 },
    ],
    workFormats: [
      { id: 1, code: 'remote', name: 'Удалённо' },
      { id: 2, code: 'hybrid', name: 'Гибрид' },
      { id: 3, code: 'office', name: 'Офис' },
    ],
  };
  const skills: Skill[] = [
    'React',
    'TypeScript',
    'Next.js',
    'Go',
    'PostgreSQL',
    'Python',
    'SQL',
    'Playwright',
  ].map((name, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    name,
    code: name.toLowerCase(),
    aliases: [],
  }));
  let companies: Company[] =
    scenario === 'no-company'
      ? []
      : [
          {
            id: '00000000-0000-4000-8000-000000000001',
            name: 'Технологии Севера',
            contactEmail: 'team@example.org',
            description: 'Разрабатываем сервисы для бизнеса.',
            inn: null,
            contactUrl: null,
            logoFileId: null,
            verificationStatus: 'pending',
            createdAt: '2026-10-06T10:00:00Z',
            memberRole: scenario === 'viewer' ? 'viewer' : 'owner',
          },
          {
            id: '00000000-0000-4000-8000-000000000002',
            name: 'Скаут Лаб',
            contactEmail: 'lab@example.org',
            description: null,
            inn: null,
            contactUrl: null,
            logoFileId: null,
            verificationStatus: 'pending',
            createdAt: '2026-10-06T10:00:00Z',
            memberRole: 'recruiter',
          },
        ];
  const base = {
    companyId: companies[0]?.id ?? '',
    createdBy: 'demo',
    createdAt: '2026-10-06T10:00:00Z',
    specializationId: 1,
    gradeId: 2,
    salaryFromRub: 180000,
    salaryToRub: 240000,
    city: null,
    timezone: 'Europe/Moscow',
    workFormatIds: [1],
    skills: [
      { skillId: skills[0].id, required: true, weight: 1 },
      { skillId: skills[1].id, required: true, weight: 1 },
    ],
    status: 'active' as const,
    description:
      'Развитие личного кабинета клиентов на React и TypeScript, поддержка дизайн-системы. Первые три месяца — перенос модуля отчётов.',
  };
  let needs: EmployerNeed[] =
    scenario === 'empty'
      ? []
      : [
          {
            ...base,
            id: '00000000-0000-4000-8000-000000000014',
            title: 'Frontend-разработчик в команду платформы',
          },
          {
            ...base,
            id: '00000000-0000-4000-8000-000000000012',
            title: 'Backend-разработчик на Go',
            specializationId: 2,
            gradeId: 3,
            salaryFromRub: null,
            salaryToRub: null,
            workFormatIds: [2],
            city: 'Мурманск',
            skills: [{ skillId: skills[3].id, required: true, weight: 1 }],
            description:
              'Сервис расчёта маршрутов и интеграции с перевозчиками.',
          },
          {
            ...base,
            id: '00000000-0000-4000-8000-000000000009',
            title: 'QA-инженер по автотестам',
            specializationId: 3,
            gradeId: 1,
            salaryFromRub: 90000,
            salaryToRub: null,
            workFormatIds: [3],
            city: 'Петрозаводск',
          },
          {
            ...base,
            id: '00000000-0000-4000-8000-000000000015',
            title: 'Аналитик данных',
            specializationId: 4,
            gradeId: null,
            status: 'draft',
            salaryFromRub: null,
            salaryToRub: null,
            workFormatIds: [],
            skills: [{ skillId: skills[6].id, required: true, weight: 1 }],
          },
          {
            ...base,
            id: '00000000-0000-4000-8000-000000000004',
            title: 'DevOps-инженер',
            status: 'archived',
          },
        ];
  return {
    authorize: async () => null,
    catalogs: async () => catalogs,
    skills: async () => skills,
    companies: async (offset = 0) => {
      if (scenario === 'error') throw new Error('Демонстрация ошибки загрузки');
      return {
        items: companies.slice(offset, offset + 100),
        limit: 100,
        offset,
      };
    },
    createCompany: async (input) => {
      const company: Company = {
        ...input,
        id: crypto.randomUUID(),
        description: input.description ?? null,
        inn: input.inn ?? null,
        contactUrl: input.contactUrl ?? null,
        logoFileId: null,
        verificationStatus: 'pending',
        memberRole: 'owner',
        createdAt: new Date().toISOString(),
      };
      companies = [...companies, company];
      return company;
    },
    updateCompany: async (id, input) => {
      companies = companies.map((c) => (c.id === id ? { ...c, ...input } : c));
      return companies.find((c) => c.id === id)!;
    },
    needs: async (companyId, status, offset) => ({
      items: needs
        .filter((n) => n.companyId === companyId && n.status === status)
        .slice(offset, offset + 20),
      limit: 20,
      offset,
    }),
    need: async (companyId, id) => {
      const need = needs.find((n) => n.id === id && n.companyId === companyId);
      if (!need) throw new Error('Потребность не найдена');
      return need;
    },
    createNeed: async (companyId, input) => {
      const need = {
        ...input,
        companyId,
        id: crypto.randomUUID(),
        createdBy: 'demo',
        createdAt: new Date().toISOString(),
      };
      needs = [need, ...needs];
      return need;
    },
    updateNeed: async (companyId, id, input) => {
      if (scenario === 'save-error')
        throw new Error(
          'Демонстрация ошибки сохранения. Ваши изменения остались в форме.',
        );
      needs = needs.map((n) =>
        n.companyId === companyId && n.id === id ? { ...n, ...input } : n,
      );
      return needs.find((n) => n.id === id)!;
    },
    archiveNeed: async (companyId, id) => {
      needs = needs.map((n) =>
        n.companyId === companyId && n.id === id
          ? { ...n, status: 'archived' }
          : n,
      );
    },
    recommendations: async (_companyId, needId, offset = 0) => ({
      items: [
        {
          id: '8ff3a014-aaaa-4000-8000-000000000014',
          city: 'Москва',
          timezone: 'Europe/Moscow',
          experienceMonths: 30,
          salaryMinRub: 180000,
          searchStatus: 'open',
          workFormatIds: [1],
          matchedConditions: 3,
          reasons: [
            'Совпадает формат работы',
            'Ожидания укладываются в бюджет',
            'Совпадает часовой пояс',
          ],
          unknownConditions: ['city'],
        },
        {
          id: '773ab087-aaaa-4000-8000-000000000087',
          city: null,
          timezone: 'Europe/Moscow',
          experienceMonths: 48,
          salaryMinRub: null,
          searchStatus: 'open',
          workFormatIds: [1],
          matchedConditions: 2,
          reasons: ['Совпадает формат работы', 'Совпадает часовой пояс'],
          unknownConditions: ['city', 'salary'],
        },
      ],
      total: 2,
      offset,
      limit: 20,
      needId,
      matchingMode: 'conditions_only',
      unassessedCriteria: ['skills', 'grade', 'specialization'],
    }),
  };
};
