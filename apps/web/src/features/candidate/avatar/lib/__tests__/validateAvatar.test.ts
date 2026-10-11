import { afterEach, describe, expect, it, vi } from 'vitest';

import { avatarSchema, avatarSourceSchema } from '../../model/avatarSchema';

const validateAvatar = async (file: File) => {
  const result = await avatarSchema.safeParseAsync({ file });
  return result.success ? undefined : result.error.issues[0].message;
};

afterEach(() => vi.unstubAllGlobals());

describe('avatar validation', () => {
  it('accepts a large source for cropping while rejecting it as a final avatar', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }),
    );
    const file = new File([new Uint8Array(3 * 1024 * 1024)], 'photo.jpg', {
      type: 'image/jpeg',
    });
    expect((await avatarSourceSchema.safeParseAsync({ file })).success).toBe(
      true,
    );
    expect(close).toHaveBeenCalledOnce();
    expect((await avatarSchema.safeParseAsync({ file })).success).toBe(false);
  });
  it('rejects unsupported and damaged source images', async () => {
    const decode = vi.fn().mockRejectedValue(new Error('decode'));
    vi.stubGlobal('createImageBitmap', decode);
    expect(
      (
        await avatarSourceSchema.safeParseAsync({
          file: new File(['svg'], 'image.svg', { type: 'image/svg+xml' }),
        })
      ).success,
    ).toBe(false);
    expect(decode).not.toHaveBeenCalled();
    expect(
      (
        await avatarSourceSchema.safeParseAsync({
          file: new File(['broken'], 'image.png', { type: 'image/png' }),
        })
      ).success,
    ).toBe(false);
  });
  it('requires a selected file without throwing', async () => {
    const result = await avatarSchema.safeParseAsync({});
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues[0].message).toBe('Выберите фото.');
  });
  it('rejects files over 2 MiB before decoding', async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    });
    expect(await validateAvatar(file)).toContain('2 МБ');
  });
  it('rejects unsupported types', async () => {
    expect(
      await validateAvatar(
        new File(['svg'], 'image.svg', { type: 'image/svg+xml' }),
      ),
    ).toContain('JPEG');
  });
  it('accepts 4 megapixels and releases the bitmap', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 2000, height: 2000, close }),
    );
    expect(
      await validateAvatar(
        new File(['png'], 'image.png', { type: 'image/png' }),
      ),
    ).toBeUndefined();
    expect(close).toHaveBeenCalledOnce();
  });
  it('rejects excessive resolution and releases the bitmap', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 2001, height: 2000, close }),
    );
    expect(
      await validateAvatar(
        new File(['png'], 'image.png', { type: 'image/png' }),
      ),
    ).toContain('4 мегапикселя');
    expect(close).toHaveBeenCalledOnce();
  });
  it('rejects damaged images', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockRejectedValue(new Error('decode')),
    );
    expect(
      await validateAvatar(
        new File(['broken'], 'image.png', { type: 'image/png' }),
      ),
    ).toContain('прочитать');
  });
});
