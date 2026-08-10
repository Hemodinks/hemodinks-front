import type { AuthSession, Convenio, MedicalUserOption } from '../../types';

export type BillingPageProps = {
  session: AuthSession;
  medicalUsers: MedicalUserOption[];
  convenios: Convenio[];
  isAdmin: boolean;
  isMedical: boolean;
};
