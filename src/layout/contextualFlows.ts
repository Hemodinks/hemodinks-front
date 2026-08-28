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
  tutorials: {
    title: 'Tutoriais interativos',
    description: 'Assista a demonstrações sanitizadas dos principais fluxos do Hemodinks.',
    flows: [
      { id: 'tutorials-watch', title: 'Assistir a um tutorial', steps: ['Escolha o tutorial desejado.', 'Use os controles do player para reproduzir, pausar ou ajustar o volume.', 'Acompanhe a narração e as legendas exibidas no vídeo.'] },
    ],
  },
  billingHistory: {
    title: 'Histórico',
    description: 'Analise o faturamento por ano, mês e trimestre, em detalhes ou por meio de gráficos.',
    flows: [
      { id: 'billing-history-query', title: 'Consultar o histórico', steps: ['Selecione a aba “Histórico”.', 'Escolha o ano no dashboard de destaques trimestrais.', 'Abra o ano desejado para visualizar os meses de Cirurgias Consolidadas.', 'Abra um mês para conferir o total faturado, as glosas, o total líquido, os atendimentos pagos e os pendentes.', 'Consulte os faturamentos na tabela e use a ação “Informações resumidas” para ver os detalhes do atendimento.'] },
      { id: 'billing-history-highlights', title: 'Interpretar os destaques trimestrais', steps: ['Consulte os quatro cartões de trimestre na parte superior da tela.', 'O mês em verde claro representa o maior faturamento do trimestre.', 'O mês em vermelho claro representa o menor faturamento do trimestre.', 'Localize as mesmas cores nos accordions dos meses dentro de cada ano.', 'Ao abrir outro mês, o accordion anterior será fechado automaticamente.'] },
      { id: 'billing-history-charts', title: 'Consultar os gráficos', steps: ['Selecione a aba “Gráficos”.', 'Escolha o ano que deseja analisar.', 'No gráfico de barras, compare o total faturado em cada mês.', 'No gráfico circular, confira a participação de cada trimestre no total anual.', 'Passe o cursor ou use o teclado sobre as barras e os setores do gráfico para consultar ano, trimestre, mês, valor e percentual.'] },
      { id: 'billing-history-files', title: 'Gerenciar arquivos mensais', steps: ['Na aba “Histórico”, abra o ano e o mês desejados.', 'Consulte os documentos vinculados ao mês.', 'Se o seu perfil permitir, selecione “Anexar arquivos” para enviar novos documentos.', 'Use as ações do arquivo para baixar ou excluir o documento.'] },
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
    title: 'Opções',
    description: 'Ajuste a aparência, as credenciais de acesso e acompanhe os registros técnicos da clínica.',
    flows: [
      { id: 'settings-theme', title: 'Alterar tema', steps: ['Encontre a seção “Tema”.', 'Selecione “Claro” ou “Escuro”.', 'A preferência é aplicada imediatamente.'] },
      { id: 'settings-password', title: 'Alterar senha', steps: ['Informe a senha atual.', 'Digite e confirme a nova senha.', 'Envie o formulário e aguarde a confirmação.'] },
      { id: 'settings-monitoring', title: 'Consultar o monitoramento', steps: ['Selecione a aba “Monitoramento” no topo de Opções.', 'Confira os erros registrados e a data e hora de cada ocorrência.', 'Analise módulo, método, linha, usuário, operação e identificação da requisição.', 'Consulte a sequência do fluxo de classes para acompanhar a origem do erro.', 'Quando disponível, abra “Query” para visualizar o comando relacionado.', 'Use “Atualizar” para buscar os registros mais recentes e navegue pelas páginas quando houver mais resultados.'] },
      { id: 'settings-monitoring-clear', title: 'Limpar os logs de erro', steps: ['Acesse a aba “Monitoramento”.', 'Selecione “Limpar logs”.', 'Leia o aviso e confirme em “Limpar logs”.', 'Os registros atuais serão removidos, mas novos erros continuarão sendo registrados automaticamente.'] },
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

