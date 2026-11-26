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
  // #292: resultado assíncrono guardado com a foto pedida; foto direta é calculada na renderização.
  const [loaded, setLoaded] = useState<{ photo: string; source: string } | null>(null);
  const [fallbackFor, setFallbackFor] = useState<string | null>(null);

  useEffect(() => {
    if (!canLoadFromApi) return undefined;
    let objectUrl = '';
    let active = true;

    void getSystemSettingsCompanyPhoto()
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);

        if (active) {
          setLoaded({ photo: trimmedPhoto, source: objectUrl });
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      })
      .catch(() => {
        if (active) {
          setLoaded({ photo: trimmedPhoto, source: resolveProfilePhotoSource(trimmedPhoto) });
        }
      });

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [canLoadFromApi, trimmedPhoto]);

  const photoSource = !trimmedPhoto ? ''
    : canLoadFromApi ? (loaded?.photo === trimmedPhoto ? loaded.source : '')
      : resolveProfilePhotoSource(trimmedPhoto);
  const useFallback = fallbackFor === trimmedPhoto;
  const src = useFallback || !photoSource ? defaultCompanyLogo : photoSource;

  return (
    <img
      src={src}
      alt={decorative ? '' : companyName}
      aria-hidden={decorative ? true : undefined}
      className={className}
      onError={() => setFallbackFor(trimmedPhoto)}
    />
  );
}
