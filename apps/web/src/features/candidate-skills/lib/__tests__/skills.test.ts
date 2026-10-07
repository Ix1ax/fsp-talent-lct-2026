import { describe, expect, it } from 'vitest';

import type { CandidateSkill } from '@/entities/candidate';

import { skillSchema } from '../../constants';
import { upsertCandidateSkill } from '../skills';

const skill: CandidateSkill = {
  skillId: 'go',
  name: 'Go',
  code: 'go',
  claimedLevel: 1,
  moderationStatus: 'approved',
  source: 'claimed',
  confidence: 0.3,
  updatedAt: '',
};

describe('candidate skills', () => {
  it('replaces canonical skills without creating duplicates', () => {
    const next = { ...skill, claimedLevel: 5 as const };
    expect(upsertCandidateSkill([skill], next)).toEqual([next]);
  });
  it('preserves pending moderation and server confirmation data', () => {
    const next = {
      ...skill,
      skillId: 'svelte',
      name: 'Svelte',
      moderationStatus: 'pending' as const,
    };
    expect(upsertCandidateSkill([skill], next)).toEqual([skill, next]);
  });
  it('rejects blank names and non-integer or out-of-range levels', () => {
    expect(skillSchema.safeParse({ name: ' ', claimedLevel: 1 }).success).toBe(
      false,
    );
    for (const claimedLevel of [0, 6, 1.5])
      expect(skillSchema.safeParse({ name: 'Go', claimedLevel }).success).toBe(
        false,
      );
    expect(skillSchema.parse({ name: ' Go ', claimedLevel: 5 })).toEqual({
      name: 'Go',
      claimedLevel: 5,
    });
  });
});
