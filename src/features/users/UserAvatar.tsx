import { useEffect, useState } from 'react';
import { getUserProfilePhoto } from '../../services';
import { formatPersonName, getUserInitials, resolveProfilePhotoSource } from '../../shared/utils/formatters';

type UserAvatarProps = {
  userId?: number;
  name: string;
  photo?: string | null;
  authToken?: string;
  size?: 'sm' | 'lg';
  decorative?: boolean;
};

// #292: o resultado da carga assíncrona fica guardado com a chave da foto pedida; foto sem API
// (data:/blob: ou ausente) é calculada na renderização. Nenhum setState síncrono em efeito.
type LoadedPhoto = { key: string; source: string; failed: boolean };

export function UserAvatar({ userId, name, photo, authToken, size = 'sm', decorative = false }: UserAvatarProps) {
  const displayName = formatPersonName(name);
  const trimmedPhoto = photo?.trim() || '';
  const canLoadFromApi = Boolean(userId && authToken && trimmedPhoto && !/^(data:image\/|blob:)/i.test(trimmedPhoto));
  const photoKey = `${userId ?? ''}|${authToken ?? ''}|${trimmedPhoto}`;
  const [loaded, setLoaded] = useState<LoadedPhoto | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!canLoadFromApi || !userId || !authToken) return undefined;
    let objectUrl = '';
    let active = true;

    void getUserProfilePhoto(userId, authToken)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);

        if (active) {
          setLoaded({ key: photoKey, source: objectUrl, failed: false });
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      })
      .catch(() => {
        if (active) {
          const fallbackSource = resolveProfilePhotoSource(trimmedPhoto);
          setLoaded({ key: photoKey, source: fallbackSource, failed: !fallbackSource });
        }
      });

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [authToken, canLoadFromApi, photoKey, trimmedPhoto, userId]);

  const current = loaded?.key === photoKey ? loaded : null;
  const photoSource = !trimmedPhoto ? '' : canLoadFromApi ? current?.source ?? '' : resolveProfilePhotoSource(trimmedPhoto);
  const photoFailed = failedKey === photoKey || Boolean(current?.failed);

  if (photoSource && !photoFailed) {
    return (
      <img
        className={`user-avatar ${size}`}
        src={photoSource}
        alt={decorative ? '' : `Foto de ${displayName}`}
        aria-hidden={decorative ? true : undefined}
        onError={() => setFailedKey(photoKey)}
      />
    );
  }

  return (
    <span
      className={`user-avatar fallback ${size}`}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `Sem foto de ${displayName}`}
      title={displayName}
    >
      {getUserInitials(displayName)}
    </span>
  );
}
