import type { AppView } from '../appTypes';

export type ContextualFlow = {
  id: string;
  title: string;
  steps: string[];
};

export type ViewFlows = {
  title: string;
  description: string;
  flows: ContextualFlow[];
};

export const CONTEXTUAL_FLOWS: Record<AppView, ViewFlows> = {
  dashboard: {
    title: 'Painel inicial',
    description: 'Acompanhe os indicadores da clínica e acesse rapidamente cada módulo.',
    flows: [
      { id: 'dashboard-overview', title: 'Consultar os indicadores', steps: ['Confira os totais e alertas nos cartões.', 'Use os atalhos dos cartões para abrir o módulo relacionado.', 'Abra as notificações no topo para ver as pendências.'] },
      { id: 'dashboard-navigation', title: 'Acessar um módulo', steps: ['Localize o módulo no menu lateral.', 'Selecione o item desejado.', 'Confirme o nome da tela no topo da aplicação.'] },
    ],
  },
  users: {
    title: 'Usuários',
    description: 'Cadastre, localize e mantenha os acessos dos usuários da clínica.',
    flows: [
      { id: 'users-create', title: 'Cadastrar usuário', steps: ['Selecione “Novo usuário”.', 'Preencha os dados pessoais e escolha o perfil.', 'Adicione foto ou documentos, se necessário.', 'Selecione “Cadastrar usuário”.'] },
      { id: 'users-manage', title: 'Editar ou excluir usuário', steps: ['Localize o usuário pela busca ou pela tabela.', 'Use o lápis para editar e salve as alterações.', 'Use a lixeira para excluir e confirme a operação.'] },
    ],
  },
  profile: {
    title: 'Meu cadastro',
    description: 'Atualize seus próprios dados cadastrais e documentos.',
    flows: [
      { id: 'profile-update', title: 'Atualizar cadastro', steps: ['Revise os dados apresentados no formulário.', 'Altere os campos necessários.', 'Atualize foto ou documentos, se desejado.', 'Selecione “Salvar alterações”.'] },
    ],
  },
  patients: {
    title: 'Pacientes - Cirurgias',
    description: 'Gerencie pacientes, cirurgias, procedimentos, arquivos e observações.',
    flows: [
      { id: 'patients-create', title: 'Cadastrar paciente ou cirurgia', steps: ['Selecione “Novo paciente”.', 'Informe paciente, hospital, cirurgião e convênio.', 'Adicione um ou mais procedimentos.', 'Complete os demais dados e selecione “Cadastrar paciente”.'] },
      { id: 'patients-filter-export', title: 'Filtrar e exportar', steps: ['Abra os filtros e informe os critérios desejados.', 'Aplique a consulta e confira a lista.', 'Escolha o escopo da exportação.', 'Selecione PDF ou Planilha.'] },
      { id: 'patients-manage', title: 'Gerenciar um cadastro', steps: ['Localize o paciente na tabela.', 'Use as ações da linha para editar, consultar arquivos ou observações.', 'Salve as alterações ou confirme a ação solicitada.'] },
    ],
  },
  billing: {
    title: 'Faturamento médico',
    description: 'Consulte a visão financeira consolidada dos atendimentos.',
    flows: [
      { id: 'billing-query', title: 'Consultar faturamento', steps: ['Informe o período e os filtros necessários.', 'Selecione “Consultar”.', 'Confira os totais e a lista de cirurgias.', 'Abra uma linha para consultar seus detalhes.'] },
    ],
  },
  reports: {
    title: 'Relatórios',
    description: 'Monte consultas analíticas e gere arquivos para conferência.',
    flows: [
      { id: 'reports-export', title: 'Consultar e exportar relatório', steps: ['Informe período, médicos, equipes ou outros filtros.', 'Selecione “Consultar”.', 'Confira a quantidade de atendimentos encontrada.', 'Selecione “Exportar PDF” ou “Exportar Planilha”.'] },
    ],
  },
  medicalGroups: {
    title: 'Grupos médicos',
    description: 'Organize médicos em grupos utilizados pela agenda e pelas notificações.',
    flows: [
      { id: 'groups-create', title: 'Cadastrar grupo médico', steps: ['Selecione “Novo grupo médico”.', 'Informe o nome do grupo.', 'Selecione os médicos participantes.', 'Selecione “Cadastrar grupo médico”.'] },
      { id: 'groups-manage', title: 'Editar ou excluir grupo', steps: ['Localize o grupo pela busca ou pela tabela.', 'Use o lápis para alterar nome ou participantes.', 'Use a lixeira para excluir e confirme a operação.'] },
    ],
  },
  agenda: {
    title: 'Agenda e notificações',
    description: 'Cadastre compromissos e controle seus lembretes e destinatários.',
    flows: [
      { id: 'agenda-create', title: 'Cadastrar evento', steps: ['Selecione “Novo evento”.', 'Preencha título, início e término.', 'Defina lembrete e destinatários, se necessário.', 'Selecione “Cadastrar evento”.'] },
      { id: 'agenda-manage', title: 'Gerenciar evento', steps: ['Localize o evento no calendário ou na lista.', 'Abra o evento para editar seus dados.', 'Salve, marque como concluído ou exclua o evento.'] },
    ],
  },
  settings: {
    title: 'Configuração do sistema',
    description: 'Ajuste a aparência da conta e suas credenciais de acesso.',
    flows: [
      { id: 'settings-theme', title: 'Alterar tema', steps: ['Encontre a seção “Tema”.', 'Selecione “Claro” ou “Escuro”.', 'A preferência é aplicada imediatamente.'] },
      { id: 'settings-password', title: 'Alterar senha', steps: ['Informe a senha atual.', 'Digite e confirme a nova senha.', 'Envie o formulário e aguarde a confirmação.'] },
    ],
  },
  clinics: {
    title: 'Clínicas',
    description: 'Administre tenants, planos, módulos, identidade visual e equipes.',
    flows: [
      { id: 'clinics-create', title: 'Cadastrar clínica', steps: ['Selecione a opção para adicionar uma clínica.', 'Informe identidade, plano, módulos e limites.', 'Cadastre o administrador e, se necessário, a equipe inicial.', 'Selecione “Salvar clínica”.'] },
      { id: 'clinics-switch', title: 'Entrar em outra clínica', steps: ['Localize a clínica na listagem.', 'Selecione a ação para acessar a clínica.', 'Confirme a troca e aguarde o painel ser atualizado.'] },
      { id: 'clinics-manage', title: 'Editar ou desativar clínica', steps: ['Localize a clínica desejada.', 'Abra a edição para ajustar dados, módulos ou foto.', 'Salve as alterações ou confirme a desativação.'] },
    ],
  },
};

