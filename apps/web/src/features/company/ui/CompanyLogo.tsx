import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Building2Icon } from 'lucide-react';

import type { Company } from '@/entities/company';

import type { CompanyManagementApi } from '../model/management';

interface CompanyLogoProps {
  company: Company;
  api: Pick<CompanyManagementApi, 'downloadCompanyFile'>;
}
export const CompanyLogo = ({ company, api }: CompanyLogoProps) => {
  const [image, setImage] = useState({ companyId: '', fileId: '', url: '' });
  const url =
    image.companyId === company.id && image.fileId === company.logoFileId
      ? image.url
      : '';
  useEffect(() => {
    const fileId = company.logoFileId;
    if (!fileId) return;
    const controller = new AbortController();
    let objectUrl = '';
    void api
      .downloadCompanyFile(company.id, fileId, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setImage({ companyId: company.id, fileId, url: objectUrl });
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [api, company.id, company.logoFileId]);
  return (
    <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted text-2xl font-semibold text-muted-foreground">
      {url ? (
        <Image
          src={url}
          width={64}
          height={64}
          unoptimized
          alt={`Логотип ${company.name}`}
          className="size-16 object-contain"
        />
      ) : (
        <span aria-hidden="true">
          {company.name.trim().slice(0, 1).toLocaleUpperCase('ru') || (
            <Building2Icon />
          )}
        </span>
      )}
    </span>
  );
};
