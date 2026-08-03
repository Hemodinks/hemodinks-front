import { agendaEvent, paciente, user } from './fixtures';

export type Payload = Record<string, unknown>;

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toTimeInputValue(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function buildPacienteFromPayload(id: number, payload: Payload) {
  const procedimentos = Array.isArray(payload.procedimentos)
    ? payload.procedimentos
    : paciente.procedimentos;

  return {
    ...paciente,
    id,
    userId: Number(payload.userId ?? paciente.userId),
    data: typeof payload.data === 'string' ? payload.data : paciente.data,
    nomePaciente: String(payload.nomePaciente ?? paciente.nomePaciente),
    hospitalId: Number(payload.hospitalId ?? paciente.hospitalId),
    hospital: String(payload.hospital ?? paciente.hospital),
    medicoUserId: Number(payload.medicoUserId ?? paciente.medicoUserId),
    medico: String(payload.medico ?? paciente.medico),
    convenioId: Number(payload.convenioId ?? paciente.convenioId),
    convenio: String(payload.convenio ?? paciente.convenio),
    cbhpmCodigo: String(payload.cbhpmCodigo ?? paciente.cbhpmCodigo),
    cbhpmPorte: String(payload.cbhpmPorte ?? paciente.cbhpmPorte),
    procedimento: String(payload.procedimento ?? paciente.procedimento),
    procedimentos,
    autorizacao: String(payload.autorizacao ?? paciente.autorizacao),
    pagamento: String(payload.pagamento ?? paciente.pagamento),
    repasseGlosa: String(payload.repasseGlosa ?? paciente.repasseGlosa),
    statusPago: Boolean(payload.statusPago ?? paciente.statusPago),
    cpf: String(payload.cpf ?? paciente.cpf),
    email: String(payload.email ?? paciente.email),
    telefone: String(payload.telefone ?? paciente.telefone),
    dataNascimento: String(payload.dataNascimento ?? paciente.dataNascimento),
    ativo: Boolean(payload.ativo ?? paciente.ativo),
  };
}

export function buildUserFromPayload(id: number, payload: Payload) {
  return {
    ...user,
    id,
    nome: String(payload.nome ?? user.nome),
    email: String(payload.email ?? user.email),
    telefone: String(payload.telefone ?? user.telefone),
    cpf: String(payload.cpf ?? user.cpf),
    crm: String(payload.crm ?? ''),
    crmUf: String(payload.crmUf ?? ''),
    dataNascimento: String(payload.dataNascimento ?? user.dataNascimento),
    ativo: Boolean(payload.ativo ?? true),
    perfilId: Number(payload.perfilId ?? user.perfilId),
    perfilNome: Number(payload.perfilId ?? user.perfilId) === 1 ? 'Administrador' : user.perfilNome,
  };
}

export function buildAgendaEventFromPayload(id: number, payload: Payload) {
  return {
    ...agendaEvent,
    id,
    title: String(payload.title ?? agendaEvent.title),
    description: typeof payload.description === 'string' ? payload.description : null,
    start: String(payload.start ?? agendaEvent.start),
    end: String(payload.end ?? agendaEvent.end),
    notifyMedicalProfile: Boolean(payload.notifyMedicalProfile),
    notifyUser: Boolean(payload.notifyUser),
    reminderPeriodMinutes: Number(
      payload.reminderPeriodMinutes ?? agendaEvent.reminderPeriodMinutes,
    ),
  };
}
