import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cropAvatar, getRotatedImageSize } from '../cropAvatar';

const context = {
  scale: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  fillStyle: '',
  imageSmoothingEnabled: false,
  imageSmoothingQuality: '',
};
const canvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => context),
  toBlob: vi.fn((callback: BlobCallback, type?: string) =>
    callback(new Blob(['image'], { type })),
  ),
};

beforeEach(() => {
  vi.clearAllMocks();
  canvas.getContext.mockReturnValue(context);
  canvas.toBlob.mockImplementation((callback, type) =>
    callback(new Blob(['image'], { type })),
  );
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:source');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
  vi.stubGlobal(
    'Image',
    class {
      naturalWidth = 1200;
      naturalHeight = 800;
      onload?: () => void;
      onerror?: () => void;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('avatar cropping', () => {
  it('swaps image bounds at 90 degrees and computes diagonal bounds', () => {
    const quarter = getRotatedImageSize(1200, 800, 90);
    expect(quarter.width).toBeCloseTo(800);
    expect(quarter.height).toBeCloseTo(1200);
    const diagonal = getRotatedImageSize(1200, 800, 45);
    expect(diagonal.width).toBeCloseTo(2000 / Math.sqrt(2));
    expect(diagonal.height).toBeCloseTo(2000 / Math.sqrt(2));
  });
  it('exports a square avatar using coordinates in the rotated image', async () => {
    const result = await cropAvatar(
      new File(['jpeg'], 'photo.jpeg', { type: 'image/jpeg' }),
      { x: 100, y: 200, width: 600, height: 600 },
      90,
    );
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);
    expect(context.scale).toHaveBeenCalledWith(512 / 600, 512 / 600);
    expect(context.translate).toHaveBeenNthCalledWith(1, -100, -200);
    const center = context.translate.mock.calls[1];
    expect(center[0]).toBeCloseTo(400);
    expect(center[1]).toBeCloseTo(600);
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('photo-avatar.jpg');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:source');
  });
  it('preserves PNG and does not upscale small crops', async () => {
    const result = await cropAvatar(
      new File(['png'], 'photo.png', { type: 'image/png' }),
      { x: 0, y: 0, width: 64, height: 64 },
      0,
    );
    expect(canvas.width).toBe(64);
    expect(result.type).toBe('image/png');
    expect(context.fillRect).not.toHaveBeenCalled();
  });
  it('cleans up the original URL if export fails', async () => {
    canvas.toBlob.mockImplementationOnce((callback) => callback(null));
    await expect(
      cropAvatar(
        new File(['png'], 'photo.png', { type: 'image/png' }),
        { x: 0, y: 0, width: 100, height: 100 },
        0,
      ),
    ).rejects.toThrow('Не удалось обработать фото');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:source');
  });
  it('rejects missing crop dimensions before decoding the image', async () => {
    await expect(
      cropAvatar(
        new File(['png'], 'photo.png'),
        { x: 0, y: 0, width: 0, height: 0 },
        0,
      ),
    ).rejects.toThrow('Выберите область');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
