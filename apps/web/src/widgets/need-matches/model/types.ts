import type { RecommendationPage } from '@/entities/employer-need';

export type NeedMatchesResult = {
  key: string;
  data: RecommendationPage | null;
  error: string;
};
