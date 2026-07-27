import { useMedicalGroupsDomain } from "../features/medicalGroups/useMedicalGroupsDomain";
import { usePatientsDomain } from "../features/patients/usePatientsDomain";
import { useUsersDomain } from "../features/users/useUsersDomain";

type AppDomainsOptions = {
  users: Parameters<typeof useUsersDomain>[0];
  patients: Parameters<typeof usePatientsDomain>[0];
  medicalGroups: Parameters<typeof useMedicalGroupsDomain>[0];
};

export function useAppDomains({
  users,
  patients,
  medicalGroups,
}: AppDomainsOptions) {
  return {
    usersDomain: useUsersDomain(users),
    patientsDomain: usePatientsDomain(patients),
    medicalGroupsDomain: useMedicalGroupsDomain(medicalGroups),
  };
}
