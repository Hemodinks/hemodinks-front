import { useEffect, useState } from 'react';
import { getUserProfilePhoto } from '../../api';
import { getUserInitials, resolveProfilePhotoSource } from '../../shared/utils/formatters';

type UserAvatarProps = {
  userId?: number;
  name: string;
  photo?: string | null;
  authToken?: string;
  size?: 'sm' | 'lg';
  decorative?: boolean;
};

export function UserAvatar({ userId, name, photo, authToken, size = 'sm', decorative = false }: UserAvatarProps) {
  const trimmedPhoto = photo?.trim() || '';
  const canLoadFromApi = Boolean(userId && authToken && trimmedPhoto && !/^(data:image\/|blob:)/i.test(trimmedPhoto));
  const [photoSource, setPhotoSource] = useState(() => (canLoadFromApi ? '' : resolveProfilePhotoSource(trimmedPhoto)));
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    let objectUrl = '';
    let active = true;

    setPhotoFailed(false);

    if (!trimmedPhoto) {
      setPhotoSource('');
      return undefined;
    }

    if (!canLoadFromApi || !userId || !authToken) {
      setPhotoSource(resolveProfilePhotoSource(trimmedPhoto));
      return undefined;
    }

    setPhotoSource('');

    void getUserProfilePhoto(userId, authToken)
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
          setPhotoFailed(true);
        }
      });

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [authToken, canLoadFromApi, trimmedPhoto, userId]);

  if (photoSource && !photoFailed) {
    return (
      <img
        className={`user-avatar ${size}`}
        src={photoSource}
        alt={decorative ? '' : `Foto de ${name}`}
        aria-hidden={decorative ? true : undefined}
        onError={() => setPhotoFailed(true)}
      />
    );
  }

  return (
    <span
      className={`user-avatar fallback ${size}`}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : `Sem foto de ${name}`}
      title={name}
    >
      {getUserInitials(name)}
    </span>
  );
}
