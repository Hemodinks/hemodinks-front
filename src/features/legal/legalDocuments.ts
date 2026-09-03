export type LegalDocument = {
  slug: 'termos-de-uso' | 'politica-de-privacidade';
  title: string;
  version: string;
  updatedAt: string;
  introduction: string;
  sections: Array<{ title: string; paragraphs: string[] }>;
};

// Os Termos de Uso permanecem provisórios até a revisão jurídica definitiva.
export const LEGAL_DOCUMENTS: Record<LegalDocument['slug'], LegalDocument> = {
  'termos-de-uso': {
    slug: 'termos-de-uso',
    title: 'Termos de Uso',
    version: '1.0',
    updatedAt: '2 de setembro de 2026',
    introduction: 'Estes termos apresentam as condições gerais de acesso e uso do HemoDinks.',
    sections: [
      {
        title: 'Uso do sistema',
        paragraphs: [
          'O HemoDinks apoia rotinas assistenciais e administrativas das clínicas habilitadas. O acesso deve ocorrer apenas por pessoas autorizadas e dentro das permissões atribuídas ao respectivo perfil.',
          'Cada usuário deve utilizar o sistema de forma compatível com sua atividade e com as orientações da clínica à qual está vinculado.',
        ],
      },
      {
        title: 'Credenciais e segurança',
        paragraphs: [
          'As credenciais são pessoais e devem ser protegidas contra uso indevido. Caso haja suspeita de acesso não autorizado, o usuário deve comunicar o responsável pelo sistema na clínica e atualizar sua credencial pelos meios disponíveis.',
        ],
      },
      {
        title: 'Conteúdo e registros',
        paragraphs: [
          'A inserção, atualização e consulta de informações devem respeitar as autorizações do usuário, as regras internas da clínica e a legislação aplicável. Informações de terceiros não devem ser incluídas sem necessidade para a finalidade do sistema.',
        ],
      },
      {
        title: 'Funcionamento e atualizações',
        paragraphs: [
          'O sistema pode receber ajustes de segurança, acessibilidade e funcionamento. Alterações relevantes destes termos serão identificadas pela versão e pela data de atualização exibidas nesta página.',
        ],
      },
      {
        title: 'Dúvidas',
        paragraphs: [
          'Dúvidas sobre o uso do HemoDinks devem ser encaminhadas pelos canais de atendimento disponibilizados pela clínica ou pelo responsável pela contratação do sistema.',
        ],
      },
    ],
  },
  'politica-de-privacidade': {
    slug: 'politica-de-privacidade',
    title: 'Aviso de Privacidade do HemoDinks',
    version: '1.1',
    updatedAt: '3 de setembro de 2026',
    introduction: '',
    sections: [],
  },
};
