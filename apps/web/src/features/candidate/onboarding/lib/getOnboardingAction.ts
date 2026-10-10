import { DYNAMIC_ROUTES, STATIC_ROUTES } from '@/shared/contants';
import type { CandidateOnboarding } from '@/entities/candidate/profile';

export const getOnboardingAction = (onboarding: CandidateOnboarding) => {
  switch (onboarding.nextStep) {
    case 'consent':
      return {
        title: 'Начните с согласия',
        description:
          'Разрешите обработку данных, чтобы заполнить профиль и подтвердить навыки.',
        label: 'Настроить согласия',
        href: STATIC_ROUTES.CANDIDATE_CONSENTS,
      };
    case 'profile':
      return {
        title: 'Создайте профиль',
        description: 'Добавьте основные сведения об опыте и условиях работы.',
        label: 'Заполнить профиль',
        href: STATIC_ROUTES.CANDIDATE_PROFILE,
      };
    case 'survey':
      return {
        title: 'Выберите направление',
        description:
          'Укажите стек, специализацию и предполагаемый уровень перед тестированием.',
        label: 'Заполнить опрос',
        href: STATIC_ROUTES.CANDIDATE_SURVEY,
      };
    case 'in_progress':
      if (onboarding.latestAttempt)
        return {
          title: 'Продолжите тест',
          description:
            'У вас есть активная попытка. Ответы сохраняются во время прохождения.',
          label: 'Продолжить тест',
          href: DYNAMIC_ROUTES.CANDIDATE_ASSESSMENT(
            onboarding.latestAttempt.id,
          ),
        };
      return {
        title: 'Проверьте активную попытку',
        description: 'Откройте тестирование, чтобы восстановить прохождение.',
        label: 'Перейти к тестам',
        href: STATIC_ROUTES.CANDIDATE_ASSESSMENTS,
      };
    case 'test':
      return {
        title: 'Подтвердите навыки',
        description:
          'Опрос сохранён. Пройдите тест по выбранному стеку и уровню.',
        label: 'Выбрать тест',
        href: STATIC_ROUTES.CANDIDATE_ASSESSMENTS,
      };
    case 'complete':
      return {
        title: 'Первый этап пройден',
        description: 'Проверьте готовность профиля и выберите статус поиска.',
        label: 'Проверить готовность',
        href: STATIC_ROUTES.CANDIDATE_READINESS,
      };
  }
};
