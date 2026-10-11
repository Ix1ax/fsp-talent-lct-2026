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
        width={compact ? 26 : 140}
        height={compact ? 26 : 28}
        className={
          compact
            ? 'hidden h-[26px] w-auto dark:block'
            : 'hidden h-[22px] w-auto dark:block'
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
        width={compact ? 26 : 140}
        height={compact ? 26 : 28}
        className={
          compact
            ? 'h-[26px] w-auto dark:hidden'
            : 'h-[22px] w-auto dark:hidden'
        }
        priority
      />
    </span>
  );
};
