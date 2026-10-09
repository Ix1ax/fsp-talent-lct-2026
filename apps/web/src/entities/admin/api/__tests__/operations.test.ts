import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { z } from 'zod';

import type {
  AdminAssessmentAttempt,
  AdminAuditEvent,
  AdminCompany,
  AdminCompanyFile,
  AdminCompanyMember,
  AdminCompanyTask,
  AdminNeed,
  AdminOffer,
  AdminStats,
  AdminTaskFile,
  AdminUser,
} from '../../model';
import { adminDownloadFile } from '../adminRequest';
import type {
  adminAssessmentAttemptSchema,
  adminAuditEventSchema,
  adminCompanyFileSchema,
  adminCompanyMemberSchema,
  adminCompanySchema,
  adminCompanyTaskSchema,
  adminNeedSchema,
  adminOfferSchema,
  adminStatsSchema,
  adminTaskFileSchema,
  adminUserSchema,
} from '../operationsSchemas';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('keeps operations domain models identical to the validated backend contracts', () => {
  expectTypeOf<AdminCompany>().toEqualTypeOf<
    z.output<typeof adminCompanySchema>
  >();
  expectTypeOf<AdminUser>().toEqualTypeOf<z.output<typeof adminUserSchema>>();
  expectTypeOf<AdminNeed>().toEqualTypeOf<z.output<typeof adminNeedSchema>>();
  expectTypeOf<AdminOffer>().toEqualTypeOf<z.output<typeof adminOfferSchema>>();
  expectTypeOf<AdminCompanyTask>().toEqualTypeOf<
    z.output<typeof adminCompanyTaskSchema>
  >();
  expectTypeOf<AdminAssessmentAttempt>().toEqualTypeOf<
    z.output<typeof adminAssessmentAttemptSchema>
  >();
  expectTypeOf<AdminCompanyMember>().toEqualTypeOf<
    z.output<typeof adminCompanyMemberSchema>
  >();
  expectTypeOf<AdminAuditEvent>().toEqualTypeOf<
    z.output<typeof adminAuditEventSchema>
  >();
  expectTypeOf<AdminStats>().toEqualTypeOf<z.output<typeof adminStatsSchema>>();
  expectTypeOf<AdminCompanyFile>().toEqualTypeOf<
    z.output<typeof adminCompanyFileSchema>
  >();
  expectTypeOf<AdminTaskFile>().toEqualTypeOf<
    z.output<typeof adminTaskFileSchema>
  >();
});
describe('private admin downloads', () => {
  it('uses the admin bearer header and preserves binary bytes without cookie credentials', async () => {
    const bytes = new Uint8Array([0, 255, 128, 10, 37]);
    const fetch = vi.fn().mockResolvedValue(new Response(bytes));
    vi.stubGlobal('fetch', fetch);
    const result = await adminDownloadFile('private-token', '/tasks/task/file');
    expect(new Uint8Array(await result.arrayBuffer())).toEqual(bytes);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/v1/admin/tasks/task/file');
    expect(url).not.toContain('private-token');
    expect(options.headers.get('Authorization')).toBe('Bearer private-token');
    expect(options.credentials).toBe('omit');
    expect(options.cache).toBe('no-store');
  });
  it('expires the admin session on unauthorized downloads and preserves the API error', async () => {
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { dispatchEvent });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: 'unauthorized', message: 'Сессия истекла' },
          }),
          { status: 401 },
        ),
      ),
    );
    await expect(
      adminDownloadFile(
        'expired-token',
        '/companies/company/files/file/download',
      ),
    ).rejects.toMatchObject({
      status: 401,
      code: 'unauthorized',
      message: 'Сессия истекла',
    });
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
  it('enforces the same deadline while reading a stalled binary body', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        blob: () => new Promise(() => {}),
      }),
    );
    const result = adminDownloadFile('token', '/tasks/task/file');
    const assertion = expect(result).rejects.toMatchObject({
      code: 'timeout',
      status: 0,
    });
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
  });
});
