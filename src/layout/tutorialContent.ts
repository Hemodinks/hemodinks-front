import type { AppView } from "../appTypes";

export type TutorialSection = {
  title: string;
  description: string;
  steps: string[];
  tip?: string;
};

export type ModuleTutorial = {
  title: string;
  summary: string;
  sections: TutorialSection[];
};

export const MODULE_TUTORIALS: Record<AppView, ModuleTutorial> = {
  dashboard: {
    title: "Painel",
    summary:
      "Acompanhe os principais números da clínica e acesse rapidamente as tarefas do dia.",
    sections: [
      {
        title: "Visão geral",
        description:
          "Os cartões resumem usuários, pacientes, atendimentos e informações financeiras.",
        steps: [
          "Confira os indicadores apresentados no topo do painel.",
          "Observe os avisos que precisam de atenção.",
          "Use os atalhos para abrir o módulo relacionado.",
        ],
      },
      {
        title: "Indicadores",
        description:
          "Cada indicador é atualizado com os registros disponíveis para a clínica ativa.",
        steps: [
          "Compare os totais com o período anterior, quando disponível.",
          "Abra o módulo de origem para consultar os detalhes.",
        ],
        tip: "Atualize a página quando um lançamento recente ainda não aparecer.",
      },
      {
        title: "Atalhos e navegação",
        description:
          "O menu lateral organiza os módulos liberados para o seu perfil.",
        steps: [
          "Selecione um item do menu para trocar de módulo.",
          "Use o caminho no topo para confirmar onde você está.",
          "Consulte este tutorial sempre que precisar de orientação.",
        ],
      },
    ],
  },
  users: {
    title: "Usuários",
    summary:
      "Cadastre a equipe, consulte perfis e mantenha os acessos da clínica organizados.",
    sections: [
      {
        title: "Cadastrar usuário",
        description:
          "Crie um acesso informando os dados pessoais e profissionais obrigatórios.",
        steps: [
          "Clique em Novo usuário.",
          "Preencha identificação, contato e dados profissionais.",
          "Selecione o perfil correto e salve o cadastro.",
        ],
        tip: "Revise o e-mail antes de salvar, pois ele identifica o acesso do usuário.",
      },
      {
        title: "Perfis e permissões",
        description:
          "O perfil define quais módulos e ações ficam disponíveis para cada pessoa.",
        steps: [
          "Abra o cadastro do usuário que deseja ajustar.",
          "Escolha o perfil compatível com sua função.",
          "Salve e peça que o usuário entre novamente, se necessário.",
        ],
      },
      {
        title: "Editar ou desativar",
        description:
          "Use as ações da listagem para corrigir dados ou impedir novos acessos.",
        steps: [
          "Localize o usuário pela pesquisa.",
          "Passe o cursor sobre os ícones para identificar cada ação.",
          "Confirme alterações sensíveis somente após revisar o usuário selecionado.",
        ],
      },
    ],
  },
  profile: {
    title: "Meu perfil",
    summary:
      "Mantenha seus dados pessoais, profissionais e de segurança atualizados.",
    sections: [
      {
        title: "Dados pessoais",
        description:
          "Revise nome, contato e demais informações exibidas no seu perfil.",
        steps: [
          "Abra a seção de dados pessoais.",
          "Altere somente os campos que precisam de correção.",
          "Salve e confirme a mensagem de sucesso.",
        ],
      },
      {
        title: "Dados profissionais",
        description:
          "Registros e especialidades ajudam a identificar corretamente o profissional.",
        steps: [
          "Confira conselho, número do registro e especialidade.",
          "Corrija informações divergentes.",
          "Salve antes de sair da tela.",
        ],
      },
      {
        title: "Segurança",
        description:
          "Proteja sua conta e evite compartilhar credenciais de acesso.",
        steps: [
          "Use uma senha exclusiva e difícil de adivinhar.",
          "Encerre a sessão ao utilizar um computador compartilhado.",
          "Comunique o administrador caso perceba um acesso indevido.",
        ],
        tip: "Nunca informe sua senha por mensagem ou telefone.",
      },
    ],
  },
  patients: {
    title: "Pacientes",
    summary:
      "Cadastre pacientes, reúna documentos e consulte o histórico de informações.",
    sections: [
      {
        title: "Cadastrar paciente",
        description:
          "O cadastro centraliza identificação, contato, convênio e dados clínicos.",
        steps: [
          "Clique em Novo paciente.",
          "Preencha os campos obrigatórios e revise CPF e data de nascimento.",
          "Informe o convênio, quando houver, e salve.",
        ],
      },
      {
        title: "Localizar e editar",
        description:
          "Use a pesquisa para encontrar rapidamente um paciente já cadastrado.",
        steps: [
          "Pesquise por nome, documento ou outro filtro disponível.",
          "Abra a ação de edição indicada pelo ícone de lápis.",
          "Revise as alterações antes de salvar.",
        ],
      },
      {
        title: "Arquivos e observações",
        description:
          "Anexe documentos relevantes e registre observações úteis ao atendimento.",
        steps: [
          "Abra os detalhes do paciente.",
          "Selecione o arquivo correto antes de enviar.",
          "Evite incluir informações que não sejam necessárias ao cuidado.",
        ],
        tip: "Confirme sempre se o documento pertence ao paciente selecionado.",
      },
    ],
  },
  attendances: {
    title: "Atendimentos",
    summary:
      "Registre a assistência prestada e prepare os dados que seguirão para faturamento.",
    sections: [
      {
        title: "Novo atendimento",
        description:
          "Associe o paciente, o profissional e a data em que o atendimento ocorreu.",
        steps: [
          "Clique em Novo atendimento.",
          "Selecione paciente, profissional e convênio.",
          "Informe os dados solicitados e salve o registro.",
        ],
      },
      {
        title: "Procedimentos e CBHPM",
        description:
          "Adicione os procedimentos realizados com os códigos e quantidades corretos.",
        steps: [
          "Abra o atendimento que deseja complementar.",
          "Pesquise o procedimento pelo código ou descrição.",
          "Revise quantidade, valores e participantes antes de confirmar.",
        ],
        tip: "Uma codificação correta reduz divergências no faturamento.",
      },
      {
        title: "Status do atendimento",
        description:
          "O status mostra em qual etapa o registro se encontra.",
        steps: [
          "Consulte a situação na listagem.",
          "Conclua os dados pendentes antes de encaminhar.",
          "Use os filtros para localizar atendimentos por etapa.",
        ],
      },
    ],
  },
  billing: {
    title: "Faturamento",
    summary:
      "Organize contas médicas, envie faturamentos e acompanhe retornos e glosas.",
    sections: [
      {
        title: "Criar faturamento",
        description:
          "Agrupe os atendimentos prontos para gerar uma cobrança ao convênio.",
        steps: [
          "Clique em Novo faturamento.",
          "Selecione os atendimentos que farão parte da cobrança.",
          "Revise valores e gere o faturamento.",
        ],
      },
      {
        title: "Enviar e acompanhar",
        description:
          "A situação da linha indica quando o faturamento está pronto ou já foi enviado.",
        steps: [
          "Passe o cursor sobre os ícones da coluna Ações.",
          "Use Enviar faturamento quando todos os dados estiverem corretos.",
          "Acompanhe a mudança de status na listagem.",
        ],
        tip: "Confira guia, valores e convênio antes do envio.",
      },
      {
        title: "Retorno, glosa e título",
        description:
          "Registre o resultado recebido e encaminhe os valores reconhecidos ao financeiro.",
        steps: [
          "Abra Registrar retorno para informar reconhecimentos e glosas.",
          "Revise os totais após o processamento.",
          "Use Gerar título para criar a conta financeira correspondente.",
        ],
      },
    ],
  },
  finance: {
    title: "Financeiro",
    summary:
      "Consulte títulos, registre recebimentos e acompanhe saldos e comprovantes.",
    sections: [
      {
        title: "Consultar títulos",
        description:
          "Os filtros ajudam a localizar contas por paciente, documento, período ou situação.",
        steps: [
          "Abra Filtros financeiros.",
          "Informe os critérios desejados.",
          "Selecione o documento para abrir seus detalhes.",
        ],
      },
      {
        title: "Registrar recebimento",
        description:
          "Baixe total ou parcialmente um título informando valor e forma de pagamento.",
        steps: [
          "Selecione o título correto.",
          "Informe valor recebido, forma e referência bancária.",
          "Confirme e confira o saldo atualizado.",
        ],
        tip: "Revise o valor antes de confirmar: ele altera o saldo do título.",
      },
      {
        title: "Estorno e comprovante",
        description:
          "No detalhe da conta você pode consultar o histórico e corrigir um recebimento.",
        steps: [
          "Abra o título e localize o lançamento no histórico.",
          "Use o ícone indicado para estornar ou editar, quando permitido.",
          "Baixe o comprovante pela ação disponível na linha.",
        ],
      },
    ],
  },
  prices: {
    title: "Tabela de preços",
    summary:
      "Defina valores negociados, percentuais e vigências por convênio e procedimento.",
    sections: [
      {
        title: "Cadastrar preço",
        description:
          "Relacione um convênio a um código CBHPM e informe o valor negociado.",
        steps: [
          "Selecione o convênio.",
          "Informe o código CBHPM e o valor.",
          "Defina percentuais, vigência e salve.",
        ],
      },
      {
        title: "Vigência e percentuais",
        description:
          "As datas determinam quando o preço pode ser aplicado aos atendimentos.",
        steps: [
          "Informe uma vigência inicial válida.",
          "Use a vigência final quando o contrato tiver prazo definido.",
          "Revise os percentuais principal e auxiliares.",
        ],
        tip: "Evite períodos conflitantes para o mesmo convênio e procedimento.",
      },
      {
        title: "Editar ou desativar",
        description:
          "As ações da listagem permitem manter o histórico sem perder o cadastro.",
        steps: [
          "Localize o preço desejado.",
          "Use o ícone de lápis para editar.",
          "Use a ação de desativação quando o preço não deve mais ser aplicado.",
        ],
      },
    ],
  },
  medicalGroups: {
    title: "Grupos médicos",
    summary:
      "Organize profissionais em grupos para facilitar configurações e rotinas da clínica.",
    sections: [
      {
        title: "Criar grupo",
        description:
          "Use um nome claro para identificar a equipe ou finalidade do grupo.",
        steps: [
          "Clique em Novo grupo médico.",
          "Informe nome e descrição.",
          "Salve para liberar o gerenciamento de membros.",
        ],
      },
      {
        title: "Gerenciar membros",
        description:
          "Inclua somente os profissionais que devem fazer parte do grupo.",
        steps: [
          "Abra o grupo desejado.",
          "Selecione os profissionais disponíveis.",
          "Confirme e revise a quantidade de membros.",
        ],
      },
      {
        title: "Manutenção",
        description:
          "Edite informações ou desative grupos que deixaram de ser usados.",
        steps: [
          "Localize o grupo na listagem.",
          "Identifique a ação pelo ícone e pelo tooltip.",
          "Confirme alterações que afetem os membros associados.",
        ],
      },
    ],
  },
  agenda: {
    title: "Agenda e notificações",
    summary:
      "Organize compromissos, acompanhe eventos e controle os avisos da equipe.",
    sections: [
      {
        title: "Navegar pela agenda",
        description:
          "Alterne o período para localizar compromissos passados ou futuros.",
        steps: [
          "Escolha a visualização disponível.",
          "Navegue até a data desejada.",
          "Selecione um evento para consultar os detalhes.",
        ],
      },
      {
        title: "Criar evento",
        description:
          "Registre data, horário, participantes e informações necessárias.",
        steps: [
          "Clique em Novo evento.",
          "Preencha título, período e participantes.",
          "Revise os dados e salve.",
        ],
        tip: "Evite incluir dados clínicos sensíveis no título da notificação.",
      },
      {
        title: "Notificações",
        description:
          "Os avisos do topo destacam eventos e atualizações que ainda não foram lidos.",
        steps: [
          "Abra Notificações no cabeçalho.",
          "Selecione um aviso para ver seu contexto.",
          "Marque como lido após conferir a informação.",
        ],
      },
    ],
  },
  settings: {
    title: "Configuração",
    summary:
      "Personalize a experiência e ajuste opções gerais disponíveis para sua conta.",
    sections: [
      {
        title: "Aparência",
        description:
          "Escolha o tema mais confortável para utilizar o sistema.",
        steps: [
          "Localize as opções de aparência.",
          "Selecione o tema desejado.",
          "Confira a legibilidade antes de continuar.",
        ],
      },
      {
        title: "Preferências",
        description:
          "As preferências controlam comportamentos gerais da sua experiência.",
        steps: [
          "Revise cada opção antes de alterar.",
          "Salve a configuração.",
          "Atualize a página caso a mudança não apareça imediatamente.",
        ],
      },
      {
        title: "Boas práticas",
        description:
          "Configurações administrativas podem afetar outros usuários.",
        steps: [
          "Altere somente opções que você conhece.",
          "Registre o motivo de mudanças importantes.",
          "Confirme o resultado nas telas relacionadas.",
        ],
        tip: "Em caso de dúvida, consulte o administrador da clínica.",
      },
    ],
  },
  clinics: {
    title: "Clínicas",
    summary:
      "Cadastre unidades, configure seus módulos e controle a situação de cada clínica.",
    sections: [
      {
        title: "Cadastrar clínica",
        description:
          "Informe os dados cadastrais e de contato da nova unidade.",
        steps: [
          "Clique em Nova clínica.",
          "Preencha identificação, documento e contato.",
          "Revise os dados e salve.",
        ],
      },
      {
        title: "Planos e módulos",
        description:
          "A configuração define quais recursos ficam disponíveis para a unidade.",
        steps: [
          "Abra a edição da clínica.",
          "Selecione o plano ou os módulos contratados.",
          "Salve e valide o acesso com a clínica correta.",
        ],
      },
      {
        title: "Editar ou desativar",
        description:
          "Use as ações da tabela para manter dados e acessos atualizados.",
        steps: [
          "Localize a unidade pelo nome ou documento.",
          "Passe o cursor sobre o ícone para confirmar a ação.",
          "Revise o impacto antes de desativar uma clínica.",
        ],
        tip: "Confirme a unidade selecionada para não interromper acessos indevidamente.",
      },
    ],
  },
};
