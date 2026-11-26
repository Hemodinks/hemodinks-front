import type { AuditoriaClinicaItem, AuditoriaDetalhe } from '../../types';

const ACTION_LABELS: Record<string, string> = {
  'paciente.listar': 'Consultou a lista de pacientes',
  'paciente.ler': 'Visualizou o cadastro',
  'paciente.criar': 'Cadastrou o paciente',
  'paciente.editar': 'Editou o cadastro',
  'paciente.inativar': 'Inativou o paciente',
  'paciente.reativar': 'Reativou o paciente',
  'paciente.resumo-financeiro': 'Consultou o resumo financeiro',
  'arquivo.enviar': 'Enviou arquivo',
  'arquivo.baixar': 'Baixou arquivo',
  'arquivo.excluir': 'Excluiu arquivo',
  'observacao.listar': 'Leu observações',
  'observacao.criar': 'Registrou observação',
  'observacao.marcar-lidas': 'Marcou observações como lidas',
  'atendimento.criar': 'Cadastrou atendimento',
  'atendimento.editar': 'Alterou atendimento',
  'atendimento.cancelar': 'Cancelou atendimento',
};

// Ações oferecidas no filtro da tela geral (alterações primeiro).
export const AUDIT_ACTION_OPTIONS = [
  'paciente.inativar', 'paciente.reativar', 'paciente.editar', 'paciente.criar',
  'atendimento.criar', 'atendimento.editar', 'atendimento.cancelar',
  'arquivo.enviar', 'arquivo.excluir', 'observacao.criar',
  'paciente.ler', 'arquivo.baixar', 'observacao.listar', 'paciente.resumo-financeiro',
].map((value) => ({ value, label: ACTION_LABELS[value] ?? value }));

// A API grava os nomes dos campos sem acento; a tela mostra com acento.
const FIELD_LABELS: Record<string, string> = {
  'Data da solicitacao': 'Data da solicitação',
  'Data da consolidacao': 'Data da consolidação',
  'Status da cirurgia': 'Status da cirurgia',
  Diagnostico: 'Diagnóstico',
  'Tratamento medico': 'Tratamento médico',
  Convenio: 'Convênio',
  Cirurgiao: 'Cirurgião',
  Autorizacao: 'Autorização',
  'Data do pagamento': 'Data do pagamento',
  'Motivo da glosa': 'Motivo da glosa',
  Observacao: 'Observação',
  '...': 'Outras alterações',
};

const VALUE_LABELS: Record<string, string> = {
  NaoConsolidada: 'Não consolidada',
  Consolidada: 'Consolidada',
  Eletiva: 'Eletiva',
  Urgencia: 'Urgência',
  EmAutorizacao: 'Em autorização',
  Planejado: 'Planejado',
  Autorizado: 'Autorizado',
  Realizado: 'Realizado',
  Cancelado: 'Cancelado',
  Nao: 'Não',
};

export function getAuditActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

export function getAuditFieldLabel(field: string) {
  return FIELD_LABELS[field] ?? field;
}

export function getAuditValueLabel(value: string | null | undefined) {
  if (value === null || value === undefined || value === '') return 'vazio';
  return VALUE_LABELS[value] ?? value;
}

// A API guarda UTC; sem fuso explícito o navegador leria como horário local.
export function formatAuditDate(value: string) {
  const iso = /[zZ]$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

export function describeAuditActor(item: AuditoriaClinicaItem) {
  const user = item.usuarioNome ?? (item.usuarioId ? `Usuário #${item.usuarioId}` : 'Não identificado');
  if (!item.equipeOperadorId) return user;
  const operator = item.equipeOperadorNome ?? `operador #${item.equipeOperadorId}`;
  return `${user} (operador: ${operator})`;
}

// Detalhe inválido ou de versão desconhecida não quebra a tela: só deixa de ser exibido.
export function parseAuditDetail(detalhe: string | null | undefined): AuditoriaDetalhe | null {
  if (!detalhe) return null;
  try {
    const parsed: unknown = JSON.parse(detalhe);
    if (!parsed || typeof parsed !== 'object') return null;
    const { motivo, alteracoes } = parsed as AuditoriaDetalhe;
    return {
      motivo: typeof motivo === 'string' ? motivo : undefined,
      alteracoes: Array.isArray(alteracoes) ? alteracoes.filter((item) => item && typeof item.campo === 'string') : undefined,
    };
  } catch {
    return null;
  }
}
