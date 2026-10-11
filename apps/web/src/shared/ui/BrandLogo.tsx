import Image from 'next/image';

interface BrandLogoProps {
  compact?: boolean;
}

export const BrandLogo = ({ compact = false }: BrandLogoProps) => {
  return (
    <span className="inline-flex items-center">
      <Image
        src={
          compact
            ? '/brand/scout-mark.svg'
            : '/brand/scout-horizontal-on-dark.svg'
        }
        alt="ФСП Скаут"
        width={compact ? 24 : 127}
        height={compact ? 28 : 32}
        className={
          compact
            ? 'hidden h-[28px] w-auto dark:block'
            : 'hidden h-[32px] w-auto dark:block'
        }
        priority
      />
      <Image
        src={
          compact
            ? '/brand/scout-mark-on-light.svg'
            : '/brand/scout-horizontal-on-light.svg'
        }
        alt="ФСП Скаут"
        width={compact ? 24 : 127}
        height={compact ? 28 : 32}
        className={
          compact
            ? 'h-[28px] w-auto dark:hidden'
            : 'h-[32px] w-auto dark:hidden'
        }
        priority
      />
    </span>
  );
};
