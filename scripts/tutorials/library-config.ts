import type { TutorialId } from '../../src/features/tutorials/tutorialRegistry';

export const TUTORIAL_MEDIA = {
  'login-clinic': { slug: 'login-clinica', category: 'Acesso', title: 'Seleção de clínica e login' },
  'clinic-registration': { slug: 'cadastro-clinica', category: 'Plataforma', title: 'Cadastro de uma clínica' },
  'team-identification': { slug: 'equipe-identificacao', category: 'Plataforma', title: 'Equipe e tipos de identificação' },
  'patient-registration': { slug: 'cadastro-paciente', category: 'Pacientes', title: 'Cadastro de paciente' },
  'surgery-registration': { slug: 'atendimento-cirurgia', category: 'Pacientes', title: 'Cadastro de atendimento e cirurgia' },
  'billing-management': { slug: 'gestao-faturamento', category: 'Faturamento', title: 'Gestão de faturamento' },
  'reports-analytics': { slug: 'relatorios', category: 'Faturamento', title: 'Relatórios — consulta analítica' },
  'report-export': { slug: 'exportacao-relatorios', category: 'Faturamento', title: 'Exportação em PDF e XLSX' },
  'full-text-search': { slug: 'pesquisa-inteligente', category: 'Pesquisa', title: 'Pesquisa inteligente Full-Text Search' },
  'user-access': { slug: 'usuarios-perfis', category: 'Acessos', title: 'Usuários e perfis de acesso' },
  'clinic-switch': { slug: 'troca-clinica', category: 'Plataforma', title: 'Troca de clínica' },
  'agenda-notifications': { slug: 'agenda-notificacoes', category: 'Agenda', title: 'Agenda e notificações' },
} satisfies Record<TutorialId, { slug: string; category: string; title: string }>;

export const TUTORIAL_IDS = Object.keys(TUTORIAL_MEDIA) as TutorialId[];
export const PENDING_TUTORIAL_IDS = TUTORIAL_IDS.filter((id) => id !== 'reports-analytics');
