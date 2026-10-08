import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { CandidateEducation } from '@/entities/candidate';

import { EducationForm } from '../EducationForm';
import { EducationItem } from '../EducationItem';

const record: CandidateEducation = {
  id: 'education',
  level: 'master',
  institution: 'Университет',
  specialty: '',
  graduationYear: 2030,
  createdAt: '',
  updatedAt: '',
};

describe('education presentation', () => {
  it('renders an accessible level selector, year bounds and an API error', () => {
    const html = renderToString(
      createElement(EducationForm, {
        record,
        disabled: false,
        busy: false,
        error: 'Ваш ввод сохранён',
        onSave: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(html).toContain('Уровень образования');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('min="1950"');
    expect(html).toContain('max="2100"');
    expect(html).toContain('name="specialty"');
    expect(html).toContain('планируемый год окончания');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Ваш ввод сохранён');
  });
  it('displays a readable level, omits empty specialty and keeps edit/delete available', () => {
    const html = renderToString(
      createElement(EducationItem, {
        record,
        disabled: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );
    expect(html).toContain('Магистратура');
    expect(html).toContain('2030');
    expect(html).toContain('Редактировать образование: Университет');
    expect(html).toContain('Удалить образование: Университет');
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain('whitespace-pre-wrap');
  });
});
