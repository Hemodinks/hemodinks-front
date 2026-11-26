// Barrel temporario (#312): os tipos ficam em src/types/<dominio>.ts. Importe do arquivo do dominio em codigo novo.
export type { TipoCirurgia } from './shared/surgeryType';
export type { StatusCirurgia } from './shared/surgeryStatus';
export type { MfaLoginChallenge } from './types/mfa';
export type * from './types/users';
export type * from './types/medicalGroups';
export type * from './types/clinicalAudit';
export type * from './types/listQuery';
export type * from './types/catalog';
export type * from './types/dashboard';
export type * from './types/agenda';
export type * from './types/auth';
export type * from './types/settings';
export type * from './types/billing';
export type * from './types/clinics';
export type * from './types/teams';
export type * from './types/patient';
