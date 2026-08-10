import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { readProfilePhoto } from '../../shared/utils/files';
import {
  ALLOWED_PATIENT_FILE_TYPES,
  ALLOWED_PROFILE_PHOTO_TYPES,
  getErrorMessage,
  MAX_PATIENT_FILE_BYTES,
  MAX_PROFILE_PHOTO_BYTES,
} from '../../shared/utils/formatters';
import type { UserFormData } from '../../types';

type Options = {
  setFormData: Dispatch<SetStateAction<UserFormData>>;
  setFormError: Dispatch<SetStateAction<string>>;
  setPhotoInputKey: Dispatch<SetStateAction<number>>;
  setPendingFiles: Dispatch<SetStateAction<File[]>>;
};

export function useUserFileInputs({
  setFormData,
  setFormError,
  setPhotoInputKey,
  setPendingFiles,
}: Options) {
  const handleProfilePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
      setFormError('Use uma foto PNG, JPG ou WEBP.');
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setFormError('A foto deve ter no maximo 2 MB.');
      return;
    }

    try {
      const fotoPerfil = await readProfilePhoto(file);
      setFormData((current) => ({ ...current, fotoPerfil }));
      setFormError('');
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleRemoveProfilePhoto = () => {
    setFormData((current) => ({ ...current, fotoPerfil: null }));
    setPhotoInputKey((key) => key + 1);
  };

  const handleUserFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;

    const invalidFile = files.find((file) => (
      !ALLOWED_PATIENT_FILE_TYPES.has(file.type) || file.size > MAX_PATIENT_FILE_BYTES
    ));
    if (invalidFile) {
      setFormError('Use PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX, TXT, CSV, PPT ou PPTX de até 10 MB.');
      return;
    }

    setPendingFiles((current) => [...current, ...files]);
    setFormError('');
  };

  const removePendingUserFile = (indexToRemove: number) => {
    setPendingFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  return {
    handleProfilePhotoChange,
    handleRemoveProfilePhoto,
    handleUserFilesChange,
    removePendingUserFile,
  };
}
