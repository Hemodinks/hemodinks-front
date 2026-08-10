import { useState } from 'react';
import type { User, UserFormData } from '../../types';
import { emptyUserForm, getUserFormData } from './userUtils';

export function useUserForm() {
  const [formData, setFormData] = useState<UserFormData>(emptyUserForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingUserDetails, setEditingUserDetails] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [userFileInputKey, setUserFileInputKey] = useState(0);
  const [pendingUserFiles, setPendingUserFiles] = useState<File[]>([]);

  const resetUserForm = () => {
    setFormData(emptyUserForm);
    setEditingId(null);
    setEditingUserDetails(null);
    setFormError('');
    setPendingUserFiles([]);
    setPhotoInputKey((key) => key + 1);
    setUserFileInputKey((key) => key + 1);
  };

  const applyUserToForm = (user: User) => {
    setEditingId(user.id);
    setFormData(getUserFormData(user));
    setPhotoInputKey((key) => key + 1);
    setUserFileInputKey((key) => key + 1);
  };

  return {
    formData,
    setFormData,
    editingId,
    setEditingId,
    editingUserDetails,
    setEditingUserDetails,
    formLoading,
    setFormLoading,
    formError,
    setFormError,
    photoInputKey,
    setPhotoInputKey,
    userFileInputKey,
    setUserFileInputKey,
    pendingUserFiles,
    setPendingUserFiles,
    resetUserForm,
    applyUserToForm,
  };
}
