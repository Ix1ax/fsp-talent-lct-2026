import { afterEach, describe, expect, it, vi } from 'vitest';

import { validateCompanyFile } from '../validateCompanyFile';

describe('company files limits', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('rejects empty files, SVG logos and PDF logos', async () => {
    await expect(
      validateCompanyFile(
        new File([], 'a.png', { type: 'image/png' }),
        'company_logo',
      ),
    ).rejects.toThrow('Размер файла');
    await expect(
      validateCompanyFile(
        new File(['svg'], 'a.svg', { type: 'image/svg+xml' }),
        'company_logo',
      ),
    ).rejects.toThrow('JPEG или PNG');
    await expect(
      validateCompanyFile(
        new File(['pdf'], 'a.pdf', { type: 'application/pdf' }),
        'company_logo',
      ),
    ).rejects.toThrow('JPEG или PNG');
  });
  it('closes decoded image resources and rejects more than 4 million pixels', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ width: 2500, height: 2000, close })),
    );
    await expect(
      validateCompanyFile(
        new File(['png'], 'logo.png', { type: 'image/png' }),
        'company_logo',
      ),
    ).rejects.toThrow('4 миллионов');
    expect(close).toHaveBeenCalledOnce();
  });
  it('accepts PDF documents without decoding an image', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn());
    await expect(
      validateCompanyFile(
        new File(['pdf'], 'doc.pdf', { type: 'application/pdf' }),
        'company_document',
      ),
    ).resolves.toBeUndefined();
    expect(createImageBitmap).not.toHaveBeenCalled();
  });
});
