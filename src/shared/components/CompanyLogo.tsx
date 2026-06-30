import { useEffect, useState } from 'react';
import defaultCompanyLogo from '../../../imagem hemodinks github.jpg';
import { resolveProfilePhotoSource } from '../utils/formatters';

type CompanyLogoProps = {
  companyName: string;
  photo?: string | null;
  className?: string;
  decorative?: boolean;
};

export function CompanyLogo({
  companyName,
  photo,
  className,
  decorative = false,
}: CompanyLogoProps) {
  const [useFallback, setUseFallback] = useState(false);
  const resolvedPhoto = resolveProfilePhotoSource(photo);
  const src = useFallback || !resolvedPhoto ? defaultCompanyLogo : resolvedPhoto;

  useEffect(() => {
    setUseFallback(false);
  }, [photo]);

  return (
    <img
      src={src}
      alt={decorative ? '' : companyName}
      aria-hidden={decorative ? true : undefined}
      className={className}
      onError={() => setUseFallback(true)}
    />
  );
}
