import { expect, it } from 'vitest';

import { getEmployerLocationState } from '../getEmployerLocationState';

it('restores company, archived tab, page and selected need from a direct link', () => {
  expect(
    getEmployerLocationState(
      '?company=company-2&tab=archived&offset=40&need=00000000-0000-4000-8000-000000000001',
    ),
  ).toEqual({
    companyId: 'company-2',
    status: 'archived',
    offset: 40,
    selectedId: '00000000-0000-4000-8000-000000000001',
  });
});
it.each(['-1', '10001', '1.5', 'unknown'])(
  'ignores invalid offset %s without losing company selection',
  (offset) => {
    expect(
      getEmployerLocationState(
        `?company=company-2&tab=unknown&offset=${offset}&need=bad`,
      ),
    ).toEqual({
      companyId: 'company-2',
      status: 'active',
      offset: 0,
      selectedId: '',
    });
  },
);
it('keeps a valid draft tab and maximum supported offset', () => {
  expect(getEmployerLocationState('?tab=draft&offset=10000')).toMatchObject({
    status: 'draft',
    offset: 10000,
  });
});
