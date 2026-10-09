import { describe, expect, it } from 'vitest';

import { getEmployerHref, getEmployerReturnPath } from '../employerLocation';
describe('employer navigation state', () => {
  it('preserves all supported state through authentication for root and sections', () => {
    const params = {
      company: 'A',
      tab: 'archived',
      offset: '20',
      need: 'N',
      ignored: 'x',
    };
    expect(getEmployerReturnPath('overview', params)).toBe(
      '/employer?company=A&tab=archived&offset=20&need=N',
    );
    expect(getEmployerReturnPath('vacancies', params)).toBe(
      '/employer/vacancies?company=A&tab=archived&offset=20&need=N',
    );
  });
  it('accepts a token only on the invitation route and rejects array parameters', () => {
    expect(
      getEmployerReturnPath('invitation', {
        token: 'a&b',
        company: ['A', 'B'],
      }),
    ).toBe('/employer/invitation?token=a%26b');
    expect(getEmployerReturnPath('profile', { token: 'secret' })).toBe(
      '/employer/profile',
    );
  });
  it('keeps retained need selection, but removes another company’s selection', () => {
    expect(
      getEmployerHref(
        'documents',
        'A',
        '?company=A&tab=draft&need=N&offset=20',
      ),
    ).toBe('/employer/documents?company=A&tab=draft&offset=20&need=N');
    expect(
      getEmployerHref('profile', 'B', '?company=A&tab=draft&need=N&offset=20'),
    ).toBe('/employer/profile?company=B&tab=draft');
  });
});
