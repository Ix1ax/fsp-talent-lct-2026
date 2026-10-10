import { BrandPattern } from '@/shared/ui';

/**
 * Фон админки закреплён в области прокрутки: липкий слой высотой в экран
 * не занимает места и не уезжает вместе с содержимым.
 */
export const AdminBackground = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none sticky top-0 -mb-[100dvh] h-dvh"
  >
    <BrandPattern />
  </div>
);
