import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { ExperienceForm } from '../ExperienceForm';
import { ExperienceItem } from '../ExperienceItem';

const record = {
  id: 'record',
  company: 'Компания',
  position: 'Разработчик',
  startedOn: '2022-11',
  endedOn: null,
  description: 'Первая строка\nВторая строка',
  createdAt: '',
  updatedAt: '',
};

describe('experience presentation', () => {
  it('renders the current-job control, disabled ending month, and an accessible API error', () => {
    const html = renderToString(
      createElement(ExperienceForm, {
        record,
        disabled: false,
        busy: false,
        error: 'Ваш ввод сохранён',
        onSave: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(html).toContain('Работаю здесь сейчас');
    expect(html).toContain('aria-checked="true"');
    expect(html.match(/<input[^>]*name="endedOn"[^>]*>/)?.[0]).toContain(
      'disabled=""',
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Ваш ввод сохранён');
    expect(html).toContain('name="description"');
  });
  it('keeps edit and delete available for a current job and gives them distinct accessible names', () => {
    const html = renderToString(
      createElement(ExperienceItem, {
        record,
        disabled: false,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
      }),
    );
    expect(html).toContain('по настоящее время');
    expect(html).toContain('Редактировать место работы: Компания');
    expect(html).toContain('Удалить место работы: Компания');
    expect(html).not.toContain('disabled=""');
    expect(html).toContain('whitespace-pre-wrap');
  });
});
