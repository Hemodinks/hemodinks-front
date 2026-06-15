import { useState } from 'react';
import type { Convenio, Hospital, OpmeFornecedor, User } from '../../types';

export function usePatientLookups() {
  const [medicalUsers, setMedicalUsers] = useState<User[]>([]);
  const [hospitais, setHospitais] = useState<Hospital[]>([]);
  const [hospitaisError, setHospitaisError] = useState('');
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [conveniosError, setConveniosError] = useState('');
  const [opmeFornecedores, setOpmeFornecedores] = useState<OpmeFornecedor[]>([]);
  const [opmeFornecedoresError, setOpmeFornecedoresError] = useState('');

  const resetPatientLookups = () => {
    setMedicalUsers([]);
    setHospitais([]);
    setHospitaisError('');
    setConvenios([]);
    setConveniosError('');
    setOpmeFornecedores([]);
    setOpmeFornecedoresError('');
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
    opmeFornecedores,
    setOpmeFornecedores,
    opmeFornecedoresError,
    setOpmeFornecedoresError,
    resetPatientLookups,
  };
}
