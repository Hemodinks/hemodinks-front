import { useState } from 'react';
import type { Convenio, Hospital, User } from '../../types';

export function usePatientLookups() {
  const [medicalUsers, setMedicalUsers] = useState<User[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [hospitaisError, setHospitaisError] = useState('');
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [conveniosError, setConveniosError] = useState('');

  const resetPatientLookups = () => {
    setMedicalUsers([]);
    setHospitais([]);
    setHospitaisError('');
    setConvenios([]);
    setConveniosError('');
  };

  return {
    medicalUsers,
    setMedicalUsers,
    hospitais,
    setHospitais,
    hospitaisError,
    setHospitaisError,
    convenios,
    setConvenios,
    conveniosError,
    setConveniosError,
    resetPatientLookups,
  };
}
