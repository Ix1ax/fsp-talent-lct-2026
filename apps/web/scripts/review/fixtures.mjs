// Synthetic data only. Wire format matches the existing API (snake_case).
const date = '2026-10-01T12:00:00Z';
export const fixtureId = (n) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const createFixtures = (scenario = 'filled') => {
  const empty = scenario === 'empty';
  const skills = Array.from(
    { length: scenario === 'large' ? 205 : 4 },
    (_, i) => ({
      id: fixtureId(i + 1),
      code: `skill_${i + 1}`,
      name: ['Go', 'React', 'TypeScript', 'SQL'][i] ?? `Навык ${i + 1}`,
      aliases: [],
    }),
  );
  const catalogs = {
    specializations: [{ id: 1, code: 'backend', name: 'Backend' }],
    grades: [{ id: 1, code: 'middle', name: 'Middle', rank: 1 }],
    work_formats: [{ id: 1, code: 'remote', name: 'Удалённо' }],
  };
  const profile = empty
    ? null
    : {
        id: fixtureId(50),
        avatar_file_id: null,
        headline: 'Go-разработчик',
        summary: 'Разрабатываю сервисы',
        city: 'Казань',
        timezone: 'Europe/Moscow',
        experience_months: 25,
        salary_min_rub: 150000,
        search_status: 'hidden',
        work_format_ids: [1],
        updated_at: date,
      };
  const consents = {
    current_policy_version: 'v1',
    items: empty
      ? []
      : [
          {
            id: fixtureId(51),
            kind: 'processing',
            policy_version: 'v1',
            company_id: null,
            granted_at: date,
            revoked_at: null,
          },
        ],
  };
  const full = {
    profile,
    consents,
    contacts: empty
      ? null
      : {
          full_name: 'Тестовый Кандидат',
          email: 'candidate@example.test',
          phone: null,
          telegram: null,
          updated_at: date,
        },
    skills: empty
      ? []
      : [
          {
            skill_id: skills[0].id,
            name: 'Go',
            code: 'skill_1',
            claimed_level: 3,
            verified_level: null,
            source: 'claimed',
            confidence: 0.3,
            moderation_status: 'approved',
            updated_at: date,
          },
        ],
    category: null,
    achievements: [],
    readiness: {
      percent: empty ? 0 : 75,
      ready_to_publish: false,
      items: [
        {
          code: 'consent_publication',
          title: 'Согласие на публикацию',
          done: false,
          required: true,
        },
      ],
    },
  };
  const companies = empty
    ? []
    : [1, 2].map((n) => ({
        id: fixtureId(100 + n),
        name: `Тестовая компания ${n}`,
        contact_email: `company${n}@example.test`,
        description: null,
        inn: null,
        contact_url: null,
        logo_file_id: null,
        verification_status: 'pending',
        verification_version: 1,
        verification_requested_at: date,
        verification_reviewed_at: null,
        verification_reviewed_by: null,
        verification_reason: null,
        verification_document_ids: [],
        status: 'active',
        blocked_reason: null,
        blocked_at: null,
        member_role: n === 1 ? 'owner' : 'recruiter',
        created_at: date,
      }));
  const needs = companies.flatMap((c) =>
    ['active', 'draft', 'archived'].map((status, i) => ({
      id: fixtureId(200 + Number(c.id.slice(-2)) * 10 + i),
      company_id: c.id,
      created_by: fixtureId(90),
      created_at: date,
      title: `${status}: Go-разработчик`,
      description: 'Разработка сервисов компании',
      specialization_id: 1,
      grade_id: 1,
      salary_from_rub: 150000,
      salary_to_rub: 250000,
      city: null,
      timezone: 'Europe/Moscow',
      skills: [{ skill_id: skills[0].id, required: true, weight: 1 }],
      work_format_ids: [1],
      status,
    })),
  );
  const admin = {
    id: fixtureId(99),
    email: 'admin@example.test',
    role: 'superadmin',
    status: 'active',
    created_at: date,
  };
  const adminCatalogs = Object.fromEntries(
    [...Object.entries(catalogs), ['skills', skills]].map(([kind, items]) => [
      kind,
      empty
        ? []
        : items.map((item) => ({
            ...item,
            id: String(item.id),
            active: true,
            ...(kind === 'skills' ? { moderation_status: 'approved' } : {}),
          })),
    ]),
  );
  return {
    full,
    skills,
    catalogs,
    companies,
    needs,
    admin,
    adminUsers: empty
      ? []
      : ['employer', 'candidate', 'admin', 'employer'].map((role, i) => ({
          id: fixtureId(90 + i),
          role,
          full_name: [
            'Тестовый Работодатель',
            'Тестовый Кандидат',
            'Тестовый Администратор',
            null,
          ][i],
          full_name_source:
            i === 3 ? null : i === 1 ? 'candidate_contacts' : 'identity',
          email: i === 3 ? null : `${role}@example.test`,
          contact_email: i === 1 ? 'contacts@example.test' : null,
          identity_updated_at: i === 3 ? null : date,
          status: i === 1 ? 'blocked' : 'active',
          blocked_reason: i === 1 ? 'Нарушение правил платформы' : null,
          blocked_at: i === 1 ? date : null,
          created_at: date,
          updated_at: date,
          candidate_profile_id: role === 'candidate' ? fixtureId(50) : null,
          search_status: role === 'candidate' ? 'hidden' : null,
        })),
    adminMemberships: empty
      ? []
      : [
          {
            company_id: fixtureId(101),
            user_id: fixtureId(90),
            role: 'owner',
            status: 'active',
            joined_at: date,
          },
          {
            company_id: fixtureId(101),
            user_id: fixtureId(91),
            role: 'viewer',
            status: 'inactive',
            joined_at: date,
          },
          {
            company_id: fixtureId(102),
            user_id: fixtureId(90),
            role: 'recruiter',
            status: 'inactive',
            joined_at: date,
          },
        ],
    adminAudit: [],
    adminCatalogs,
    experience: empty
      ? []
      : [
          {
            id: fixtureId(60),
            company: 'Тестовая компания',
            position: 'Разработчик',
            started_on: '2024-01-01',
            ended_on: null,
            description: 'Разработка API',
            created_at: date,
            updated_at: date,
          },
        ],
    education: empty
      ? []
      : [
          {
            id: fixtureId(61),
            level: 'higher',
            institution: 'Тестовый университет',
            specialty: 'Информатика',
            graduation_year: 2022,
            created_at: date,
            updated_at: date,
          },
        ],
  };
};
