import { describe, expect, it } from 'vitest';

import {
  auditFiltersSchema,
  auditPeriodSchema,
  getOperationFilters,
  getOperationOffset,
  operationDecisionSchema,
  operationFiltersSchema,
} from '../operationForms';
import { isOperationSection } from '../operations';

describe('operations filters', () => {
  it('never carries unsupported filters from one entity into another API request', () => {
    const params = new URLSearchParams(
      'q=test&role=employer&status=hidden&company_id=bad&candidate_id=bad&grade_id=0&unknown=value',
    );
    expect(
      operationFiltersSchema.parse(getOperationFilters('companies', params)),
    ).toEqual({
      q: 'test',
      status: '',
      access_status: '',
      role: '',
      company_id: '',
      candidate_id: '',
      specialization_id: '',
      grade_id: '',
    });
    expect(
      operationFiltersSchema.parse(getOperationFilters('users', params)),
    ).toMatchObject({
      q: 'test',
      status: '',
      role: 'employer',
      company_id: '',
    });
  });
  it('combines literal user search with role and access filters and validates its length', () => {
    const params = new URLSearchParams({
      q: '  Иван_%  ',
      role: 'candidate',
      status: 'blocked',
    });
    expect(
      operationFiltersSchema.parse(getOperationFilters('users', params)),
    ).toMatchObject({ q: 'Иван_%', role: 'candidate', status: 'blocked' });
    expect(
      operationFiltersSchema.safeParse(
        getOperationFilters(
          'users',
          new URLSearchParams({ q: 'x'.repeat(201) }),
        ),
      ).success,
    ).toBe(false);
  });
  it('validates profile UUIDs and catalog limits before requesting a list', () => {
    expect(
      operationFiltersSchema.safeParse(
        getOperationFilters('offers', new URLSearchParams('candidate_id=bad')),
      ).success,
    ).toBe(false);
    expect(
      operationFiltersSchema.safeParse(
        getOperationFilters('attempts', new URLSearchParams('grade_id=32768')),
      ).success,
    ).toBe(false);
    expect(
      operationFiltersSchema.safeParse(
        getOperationFilters(
          'needs',
          new URLSearchParams('specialization_id=1&grade_id=32767'),
        ),
      ).success,
    ).toBe(true);
  });
  it('combines access and verification filters only for companies', () => {
    const params = new URLSearchParams('status=verified&access_status=blocked');
    expect(
      operationFiltersSchema.parse(getOperationFilters('companies', params)),
    ).toMatchObject({ status: 'verified', access_status: 'blocked' });
    expect(getOperationFilters('users', params).access_status).toBe('');
    expect(
      getOperationFilters('companies', new URLSearchParams('access_status=all'))
        .access_status,
    ).toBe('');
    expect(
      operationFiltersSchema.safeParse(
        getOperationFilters(
          'companies',
          new URLSearchParams('access_status=deleted'),
        ),
      ).success,
    ).toBe(false);
  });
  it.each(['-20', '10020', 'NaN', '1.5', ''])(
    'keeps offset %s within the API boundaries',
    (value) => {
      expect(getOperationOffset(new URLSearchParams({ offset: value }))).toBe(
        0,
      );
    },
  );
  it('allows the final API offset', () =>
    expect(getOperationOffset(new URLSearchParams('offset=10000'))).toBe(
      10000,
    ));
  it.each(['constructor', '__proto__', 'toString', 'unknown'])(
    'rejects unregistered route %s',
    (section) => expect(isOperationSection(section)).toBe(false),
  );
});
it('rejects reversed audit periods, control characters and oversized decision reasons', () => {
  const base = {
    source: '',
    actor_id: '',
    entity_type: '',
    entity_id: '',
    action: '',
    from: '',
    to: '',
  };
  expect(
    auditFiltersSchema.safeParse({
      ...base,
      from: '2026-10-10T12:00',
      to: '2026-10-09T12:00',
    }).success,
  ).toBe(false);
  expect(
    operationDecisionSchema.safeParse({ reason: 'a'.repeat(2001) }).success,
  ).toBe(false);
  expect(operationDecisionSchema.safeParse({ reason: 'x\0y' }).success).toBe(
    false,
  );
  expect(
    operationDecisionSchema.parse({ reason: '  Проверено\nпо документам  ' })
      .reason,
  ).toBe('Проверено\nпо документам');
});

it('requires RFC3339 with a timezone in audit query periods', () => {
  expect(
    auditPeriodSchema.safeParse({ from: '2026-10-09', to: '' }).success,
  ).toBe(false);
  expect(
    auditPeriodSchema.safeParse({ from: '2026-10-09T12:00:00', to: '' })
      .success,
  ).toBe(false);
  expect(
    auditPeriodSchema.safeParse({
      from: '2026-10-09T12:00:00+03:00',
      to: '2026-10-09T10:00:00Z',
    }).success,
  ).toBe(true);
});
