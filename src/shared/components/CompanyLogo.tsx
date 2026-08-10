import { useEffect, useState } from 'react';
import defaultCompanyLogo from '../../../imagem hemodinks github.jpg';
import { getSystemSettingsCompanyPhoto } from '../../services';
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
  const trimmedPhoto = photo?.trim() || '';
  const directPhoto = /^(data:image\/|blob:|https?:\/\/)/i.test(trimmedPhoto);
  const canLoadFromApi = Boolean(trimmedPhoto && !directPhoto);
  const [useFallback, setUseFallback] = useState(false);
  const [photoSource, setPhotoSource] = useState(() => (canLoadFromApi ? '' : resolveProfilePhotoSource(trimmedPhoto)));

  useEffect(() => {
    setUseFallback(false);

    if (!trimmedPhoto) {
      setPhotoSource('');
      return undefined;
    }

    if (!canLoadFromApi) {
      setPhotoSource(resolveProfilePhotoSource(trimmedPhoto));
      return undefined;
    }

    let objectUrl = '';
    let active = true;

    setPhotoSource('');

    void getSystemSettingsCompanyPhoto()
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);

        if (active) {
          setPhotoSource(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      })
      .catch(() => {
        if (active) {
          setPhotoSource(resolveProfilePhotoSource(trimmedPhoto));
        }
      });

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [canLoadFromApi, trimmedPhoto]);

  const src = useFallback || !photoSource ? defaultCompanyLogo : photoSource;

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
