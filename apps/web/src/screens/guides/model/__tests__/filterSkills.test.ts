import { describe, expect, it } from 'vitest';

import { filterSkills } from '../filterSkills';

const skills = [
  { id: '1', code: 'go', name: 'Go', aliases: ['golang'] },
  { id: '2', code: 'postgresql', name: 'PostgreSQL', aliases: ['постгрес'] },
  { id: '3', code: 'react', name: 'React', aliases: [] },
];

describe('filterSkills', () => {
  it('returns everything for an empty query', () => {
    expect(filterSkills(skills)).toHaveLength(3);
    expect(filterSkills(skills, '   ')).toHaveLength(3);
  });

  it('matches name, code and aliases case-insensitively', () => {
    expect(filterSkills(skills, 'GOLANG').map((s) => s.id)).toEqual(['1']);
    expect(filterSkills(skills, 'Постгрес').map((s) => s.id)).toEqual(['2']);
    expect(filterSkills(skills, 'rea').map((s) => s.id)).toEqual(['3']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterSkills(skills, 'kotlin')).toEqual([]);
  });
});
