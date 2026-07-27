import type { ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { deleteUserArquivo, getUser } from "../../services";
import { readProfilePhoto } from "../../shared/utils/files";
import {
  ALLOWED_PATIENT_FILE_TYPES,
  ALLOWED_PROFILE_PHOTO_TYPES,
  getErrorMessage,
  MAX_PATIENT_FILE_BYTES,
  MAX_PROFILE_PHOTO_BYTES,
} from "../../shared/utils/formatters";
import type { AuthSession, User } from "../../types";
import type { useUserForm } from "./useUserForm";

type UserFormState = ReturnType<typeof useUserForm>;

export function useUserFiles(
  session: AuthSession | null,
  userForm: UserFormState,
) {
  const deleteFileMutation = useMutation({
    mutationFn: ({
      userId,
      arquivoId,
      token,
    }: {
      userId: number;
      arquivoId: number;
      token: string;
    }) => deleteUserArquivo(userId, arquivoId, token),
  });

  const handleProfilePhotoChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
      userForm.setFormError("Use uma foto PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      userForm.setFormError("A foto deve ter no maximo 1 MB.");
      return;
    }

    try {
      const fotoPerfil = await readProfilePhoto(file);
      userForm.setFormData((current) => ({ ...current, fotoPerfil }));
      userForm.setFormError("");
    } catch (error) {
      userForm.setFormError(getErrorMessage(error));
    }
  };

  const handleRemoveProfilePhoto = () => {
    userForm.setFormData((current) => ({ ...current, fotoPerfil: null }));
    userForm.setPhotoInputKey((key) => key + 1);
  };

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const invalidFile = files.find(
      (file) =>
        !ALLOWED_PATIENT_FILE_TYPES.has(file.type) ||
        file.size > MAX_PATIENT_FILE_BYTES,
    );
    if (invalidFile) {
      userForm.setFormError(
        "Use PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX, TXT, CSV, PPT ou PPTX de até 10 MB.",
      );
      return;
    }

    userForm.setPendingUserFiles((current) => [...current, ...files]);
    userForm.setFormError("");
  };

  const removePendingFile = (indexToRemove: number) => {
    userForm.setPendingUserFiles((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  };

  const deleteFile = async (user: User, arquivoId: number) => {
    if (!session) return;
    userForm.setFormError("");

    try {
      await deleteFileMutation.mutateAsync({
        userId: user.id,
        arquivoId,
        token: session.token,
      });
      const details = await getUser(user.id, session.token);
      userForm.setEditingUserDetails(details);
      userForm.applyUserToForm(details);
    } catch (error) {
      userForm.setFormError(getErrorMessage(error));
    }
  };

  return {
    handleProfilePhotoChange,
    handleRemoveProfilePhoto,
    handleFilesChange,
    removePendingFile,
    deleteFile,
  };
}
