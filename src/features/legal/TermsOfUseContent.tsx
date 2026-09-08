import { Link } from 'react-router-dom';

export function TermsOfUseContent() {
  return (
    <>
      <div className="legal-document-header-copy">
        <p className="legal-document-meta"><strong>Última atualização:</strong> 3 de setembro de 2026<br /><strong>Versão:</strong> 1.1</p>
        <p>Estes Termos de Uso estabelecem as condições aplicáveis ao acesso e à utilização da plataforma HemoDinks por usuários vinculados às clínicas contratantes.</p>
        <p>Ao aceitar estes Termos e utilizar a plataforma, o usuário declara estar ciente das condições aqui estabelecidas e compromete-se a utilizar o sistema de acordo com suas permissões de acesso, as orientações da clínica e a legislação aplicável.</p>
      </div>

      <div className="legal-document-sections">
        <section>
          <h2>1. Uso do sistema</h2>
          <p>O HemoDinks é uma plataforma destinada ao apoio de rotinas assistenciais, administrativas, operacionais e de gestão das clínicas habilitadas.</p>
          <p>O acesso à plataforma é restrito a usuários autorizados pela clínica contratante e deve ocorrer exclusivamente dentro das permissões atribuídas ao respectivo perfil de acesso.</p>
          <p>O usuário deve utilizar o sistema exclusivamente para finalidades profissionais relacionadas às suas atividades e de acordo com as orientações, políticas internas e responsabilidades definidas pela clínica à qual está vinculado.</p>
        </section>

        <section>
          <h2>2. Credenciais e segurança</h2>
          <p>As credenciais de acesso são pessoais e intransferíveis.</p>
          <p>O usuário não deve compartilhar senha, código de autenticação ou qualquer outro mecanismo utilizado para acesso à plataforma.</p>
          <p>O usuário é responsável por preservar a confidencialidade de suas credenciais e deve comunicar imediatamente à clínica ou ao responsável pelo sistema qualquer suspeita de acesso não autorizado, comprometimento de senha ou utilização indevida de sua conta.</p>
          <p>O HemoDinks poderá utilizar mecanismos adicionais de segurança, incluindo autenticação em dois fatores, limitação de tentativas de acesso, encerramento de sessões e bloqueio preventivo de contas quando necessário para proteção da plataforma e de seus usuários.</p>
        </section>

        <section>
          <h2>3. Dados pessoais e informações de pacientes</h2>
          <p>O usuário deve acessar, inserir, consultar, alterar ou utilizar dados pessoais e informações relacionadas a pacientes somente quando isso for necessário para o exercício de suas atribuições e estiver autorizado pela clínica.</p>
          <p>É proibida a utilização de informações disponíveis no HemoDinks para finalidades particulares, consultas sem relação com as atividades desempenhadas ou compartilhamento com pessoas não autorizadas.</p>
          <p>O usuário deve observar as regras internas da clínica, a legislação aplicável e as medidas de segurança relacionadas à proteção de dados pessoais.</p>
          <p>O tratamento de dados pessoais realizado por meio da plataforma também está sujeito ao <Link to="/politica-de-privacidade">Aviso de Privacidade do HemoDinks</Link>.</p>
        </section>

        <section>
          <h2>4. Conteúdo e registros</h2>
          <p>O usuário é responsável pelas informações que inserir, atualizar ou registrar na plataforma no exercício de suas atividades.</p>
          <p>Os registros realizados no HemoDinks devem ser adequados, pertinentes e compatíveis com a finalidade para a qual o sistema é utilizado.</p>
          <p>Não devem ser inseridos conteúdos ilícitos, informações sabidamente incorretas ou dados pessoais que não sejam necessários às atividades realizadas na plataforma.</p>
        </section>

        <section>
          <h2>5. Responsabilidade profissional</h2>
          <p>O HemoDinks é uma ferramenta tecnológica destinada a apoiar atividades de gestão e rotinas das clínicas.</p>
          <p>A plataforma não substitui avaliações, decisões, obrigações ou responsabilidades de profissionais de saúde ou de outros profissionais responsáveis pelas atividades realizadas na clínica.</p>
          <p>Decisões clínicas, assistenciais, administrativas e financeiras permanecem sob responsabilidade dos profissionais e das instituições competentes.</p>
        </section>

        <section>
          <h2>6. Disponibilidade e manutenção</h2>
          <p>A plataforma poderá passar por atualizações, manutenções programadas, correções ou intervenções técnicas necessárias à segurança, estabilidade e evolução do serviço.</p>
          <p>Essas intervenções poderão ocasionar indisponibilidade temporária de determinadas funcionalidades ou da plataforma.</p>
          <p>Sempre que possível, intervenções relevantes que possam impactar o acesso ao sistema serão comunicadas pelos canais disponíveis.</p>
        </section>

        <section>
          <h2>7. Suspensão ou bloqueio de acesso</h2>
          <p>O acesso do usuário poderá ser suspenso ou bloqueado nos seguintes casos:</p>
          <ul>
            <li>solicitação da clínica responsável;</li>
            <li>encerramento ou alteração do vínculo do usuário;</li>
            <li>suspeita de comprometimento das credenciais;</li>
            <li>indícios de utilização indevida da plataforma;</li>
            <li>risco à segurança do sistema ou dos dados;</li>
            <li>violação destes Termos de Uso ou da legislação aplicável.</li>
          </ul>
          <p>Medidas preventivas de segurança poderão ser adotadas enquanto uma ocorrência estiver sendo analisada.</p>
        </section>

        <section>
          <h2>8. Propriedade intelectual</h2>
          <p>A plataforma HemoDinks, incluindo seu software, código, interface, identidade visual, funcionalidades, documentação, marcas e demais componentes próprios, é protegida pela legislação aplicável.</p>
          <p>O acesso ou utilização da plataforma não transfere ao usuário qualquer direito de propriedade intelectual sobre o HemoDinks ou seus componentes.</p>
          <p>É proibida a reprodução, modificação, distribuição, engenharia reversa ou utilização não autorizada de componentes da plataforma, salvo quando expressamente permitida pela legislação ou mediante autorização do responsável pelo HemoDinks.</p>
        </section>

        <section>
          <h2>9. Privacidade e proteção de dados</h2>
          <p>O tratamento de dados pessoais realizado no contexto da utilização do HemoDinks é descrito no <Link to="/politica-de-privacidade">Aviso de Privacidade</Link> da plataforma, que deve ser lido em conjunto com estes Termos de Uso.</p>
          <p>A clínica contratante e os usuários autorizados também possuem responsabilidades próprias relacionadas ao tratamento, acesso e utilização dos dados inseridos na plataforma.</p>
        </section>

        <section>
          <h2>10. Alterações destes termos</h2>
          <p>Estes Termos de Uso poderão ser atualizados em razão de alterações legais, regulatórias, técnicas, de segurança ou relacionadas às funcionalidades da plataforma.</p>
          <p>A versão vigente e sua respectiva data de atualização serão disponibilizadas nesta página.</p>
          <p>Quando houver alterações relevantes, poderá ser solicitado ao usuário que leia e aceite novamente os Termos antes de continuar utilizando a plataforma.</p>
        </section>

        <section>
          <h2>11. Dúvidas e suporte</h2>
          <p>Dúvidas relacionadas à utilização do HemoDinks podem ser encaminhadas pelos canais de atendimento disponibilizados pela clínica ou pelo responsável pela contratação da plataforma.</p>
          <p>Questões relacionadas à privacidade e ao tratamento de dados pessoais devem observar também as informações e os canais disponibilizados no <Link to="/politica-de-privacidade">Aviso de Privacidade</Link>.</p>
        </section>
      </div>
    </>
  );
}
