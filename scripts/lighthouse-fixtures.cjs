// Synthetic audit data only. Never use this server outside a local audit.
const user = {
  id: 99, clinicaId: 1, clinicaSlug: 'audit', nome: 'Administrador de auditoria',
  email: 'audit@example.invalid', cpf: null, telefone: '', fotoPerfil: null,
  precisaTrocarSenha: false, perfilId: 1, perfilNome: 'Administrador', ativo: true,
  dataCadastro: '2026-01-01T00:00:00Z', dataNascimento: '1990-01-01T00:00:00Z',
  arquivosCount: 0, arquivos: [],
};
const patients = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1, userId: index + 100, nomePaciente: `Paciente fictício ${index + 1}`,
  tipoCirurgia: 'Eletiva', data: '2026-10-01T00:00:00Z', dataAtendimento: '2026-10-01T00:00:00Z',
  hospitalId: 1, hospital: 'Hospital de auditoria', medicoUserId: 99, medico: user.nome,
  convenioId: 1, convenio: 'Particular', cbhpmCodigo: '1.01.01.01-2', cbhpmPorte: '2B',
  procedimento: 'Procedimento fictício', procedimentos: [], autorizacao: '', pagamento: 'Pix',
  statusPago: false, ativo: true, cpf: null, telefone: '', email: '', arquivos: [], arquivosCount: 0,
}));
const paged = items => ({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 });
const document = { currentVersion: '1.1', acceptedVersion: '1.1', isCurrent: true, acceptedAtUtc: '2026-10-01T00:00:00Z' };
const clinic = { id: 1, nome: 'Clínica de auditoria', slug: 'audit', cnpj: '11222333000181',
  ativa: true, plano: 'Completa', modulosLiberados: ['usuarios', 'pacientes', 'faturamento', 'grupos-medicos', 'agenda'],
  assinaturaStatus: 'Ativa', assinaturaValidaAte: '2027-01-01T00:00:00Z', limiteUsuarios: 100, usuarios: 10 };

function fixture(path, method) {
  if (path === '/api/warmup') return {};
  if (path === '/api/session/restaurar' && method === 'POST') {
    const claims = { sid: 'audit-only', usuarioGlobalId: 99, usuarioClinicaId: 99,
      clinicaId: 1, clinicaSlug: 'audit', exp: Math.floor(Date.now() / 1000) + 3600 };
    return { ...user, token: `test.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature` };
  }
  if (path === '/api/session/atividade' && method === 'POST') return { idleTimeoutMinutes: 30 };
  if (method !== 'GET') return undefined;
  const data = {
    '/api/legal-acceptances/current': { requiresAcceptance: false, termsOfUse: document, privacyNotice: document },
    '/api/privacy-preferences/current': { hasPreference: true, currentDocumentVersion: '1.1', documentVersion: '1.1', preferencesEnabled: true, analyticsEnabled: false },
    '/api/configuracoes-sistema/current': { id: 1, nomeEmpresa: 'HemoDinks Audit', fotoEmpresa: null },
    '/api/dashboard/summary': { usersCount: 10, activeUsersCount: 10, pacientesCount: 10, activePatientsCount: 10,
      pendingPaymentsCount: 2, patientFilesCount: 0, upcomingEventsCount: 1, unreadAgendaNotificationCount: 0 },
    '/api/dashboard/notifications': [],
    '/api/users': paged(Array.from({ length: 10 }, (_, index) => ({ ...user, id: index + 1, nome: `Usuário fictício ${index + 1}` }))),
    '/api/pacientes': paged(patients),
    '/api/grupos-medicos': paged([]),
    '/api/grupos-medicos/medicos': [{ id: 99, nome: user.nome }],
    '/api/hospitais': [{ id: 1, nome: 'Hospital de auditoria' }],
    '/api/convenios': [{ idConvenio: 1, descricaoConvenio: 'Particular' }],
    '/api/opme': [],
    '/api/session/clinicas': [{ clinicaId: 1, nome: clinic.nome, slug: clinic.slug }],
    '/api/platform/clinicas/1': clinic,
    '/api/events': [{ id: 1, userId: 99, title: 'Evento fictício', description: null,
      start: new Date().toISOString(), end: new Date(Date.now() + 3600000).toISOString(),
      isCompleted: false, isAllDay: false, notifyUser: false, notifyMedicalProfile: false }],
    '/api/events/medical-users': [],
    '/api/events/notification-recipients': { users: [], groups: [], totalUsers: 0, page: 1, pageSize: 10,
      canNotifyAllAllowedRecipients: true, allRecipientsLabel: 'Todos os destinatários permitidos' },
  };
  return data[path.replace(/\/$/, '')];
}
module.exports = { fixture };
