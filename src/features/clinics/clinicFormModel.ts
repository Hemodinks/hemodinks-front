import type { PlatformClinic, TeamIdentificationMode } from '../../types';
import { formatCnpjInput } from '../../shared/utils/cnpj';

export type ClinicSortField = 'nome' | 'plano' | 'assinatura' | 'usuarios' | 'status';

export type ClinicFormData = {
  nome: string; slug: string; cnpj: string; plano: string; modulosLiberados: string[]; assinaturaStatus: string; ativa: boolean;
  limiteUsuarios: string; trialAte: string; assinaturaValidaAte: string; fotoClinica?: string | null;
  administradorNome: string; administradorEmail: string; administradorSenha: string; administradorNovaSenha: string; administradorTelefone: string;
  criarEquipeInicial: boolean; equipeNome: string; equipeEmail: string; equipeSenha: string; equipeTelefone: string; equipeModoIdentificacao: TeamIdentificationMode;
};

export const EMPTY_CLINIC_FORM: ClinicFormData = {
  nome: '', slug: '', cnpj: '', plano: 'Trial', modulosLiberados: [], assinaturaStatus: 'Trial', ativa: true,
  limiteUsuarios: '', trialAte: '', assinaturaValidaAte: '', fotoClinica: undefined,
  administradorNome: '', administradorEmail: '', administradorSenha: '', administradorNovaSenha: '', administradorTelefone: '',
  criarEquipeInicial: true, equipeNome: '', equipeEmail: '', equipeSenha: '', equipeTelefone: '', equipeModoIdentificacao: 'Pin',
};

export const CLINIC_MODULE_OPTIONS = [
  { value: 'usuarios', label: 'Usuários' },
  { value: 'pacientes', label: 'Pacientes' },
  { value: 'faturamento', label: 'Faturamento médico' },
  { value: 'grupos-medicos', label: 'Grupos médicos' },
  { value: 'agenda', label: 'Agenda e notificações' },
];

export const MAX_CLINIC_NAME_LENGTH = 120;
export const MAX_CLINIC_SLUG_LENGTH = 120;
export const MAX_ADMIN_PASSWORD_LENGTH = 200;
export const MAX_BRAZIL_MOBILE_MASK_LENGTH = 19;
export const MAX_USER_LIMIT = 2_147_483_647;

export function clinicToForm(clinic: PlatformClinic): ClinicFormData {
  return {
    ...EMPTY_CLINIC_FORM,
    nome: clinic.nome,
    slug: clinic.slug,
    cnpj: formatCnpjInput(clinic.cnpj),
    plano: clinic.plano,
    modulosLiberados: clinic.modulosLiberados ?? [],
    assinaturaStatus: clinic.assinaturaStatus,
    ativa: clinic.ativa,
    limiteUsuarios: clinic.limiteUsuarios?.toString() ?? '',
    trialAte: clinic.trialAte?.slice(0, 10) ?? '',
    assinaturaValidaAte: clinic.assinaturaValidaAte?.slice(0, 10) ?? '',
    criarEquipeInicial: false,
  };
}
