import { Captions, Clock3, PlayCircle } from 'lucide-react';
import './tutorials-page.css';

const TUTORIAL_VIDEOS = [
  { slug: 'login-clinica', category: 'Acesso', title: 'Seleção de clínica e login', description: 'Escolha o tenant correto e faça uma autenticação segura.' },
  { slug: 'cadastro-clinica', category: 'Plataforma', title: 'Cadastro de uma clínica', description: 'Configure identidade, plano e administrador inicial.' },
  { slug: 'equipe-identificacao', category: 'Plataforma', title: 'Equipe e tipos de identificação', description: 'Entenda o acesso coletivo e os modos de identificação.' },
  { slug: 'cadastro-paciente', category: 'Pacientes', title: 'Cadastro de paciente', description: 'Abra e revise os campos essenciais de um cadastro.' },
  { slug: 'atendimento-cirurgia', category: 'Pacientes', title: 'Cadastro de atendimento e cirurgia', description: 'Associe datas, equipe e procedimentos ao atendimento.' },
  { slug: 'gestao-faturamento', category: 'Faturamento', title: 'Gestão de faturamento', description: 'Consulte filtros, indicadores e registros financeiros.' },
  { slug: 'relatorios', category: 'Faturamento', title: 'Relatórios — consulta analítica', description: 'Combine filtros e confira os resultados detalhados.', legacy: true },
  { slug: 'exportacao-relatorios', category: 'Faturamento', title: 'Exportação em PDF e XLSX', description: 'Prepare a consulta e escolha o formato de exportação.' },
  { slug: 'pesquisa-inteligente', category: 'Pesquisa', title: 'Pesquisa inteligente Full-Text Search', description: 'Localize registros com termos de pesquisa.' },
  { slug: 'usuarios-perfis', category: 'Acessos', title: 'Usuários e perfis de acesso', description: 'Cadastre uma conta e entenda seu perfil.' },
  { slug: 'troca-clinica', category: 'Plataforma', title: 'Troca de clínica', description: 'Alterne o contexto da sessão com segurança.' },
  { slug: 'agenda-notificacoes', category: 'Agenda', title: 'Agenda e notificações', description: 'Cadastre eventos e configure os avisos.' },
] as const;

export function TutorialsPage() {
  return (
    <section className="workspace tutorials-library" aria-labelledby="tutorials-title">
      <header className="tutorials-library-header">
        <div>
          <span className="eyebrow">Central de aprendizagem</span>
          <h2 id="tutorials-title">Tutoriais interativos</h2>
          <p>Assista às demonstrações gravadas e pratique os fluxos com segurança dentro do Hemodinks.</p>
        </div>
        <div className="tutorials-library-count" aria-label="12 tutoriais disponíveis">
          <PlayCircle aria-hidden="true" size={22} />
          <strong>12</strong>
          <span>disponíveis</span>
        </div>
      </header>

      <div className="tutorial-video-grid">
      {TUTORIAL_VIDEOS.map((tutorial) => {
        const base = 'legacy' in tutorial && tutorial.legacy ? '/tutorials/reports/tutorial-relatorios-narrado' : `/tutorials/${tutorial.slug}/tutorial-${tutorial.slug}-narrado`;
        return <article className="tutorial-video-card" key={tutorial.slug}>
        <div className="tutorial-video-heading">
          <div className="tutorial-video-icon" aria-hidden="true">
            <PlayCircle size={24} />
          </div>
          <div>
            <span className="eyebrow">{tutorial.category}</span>
            <h3>{tutorial.title}</h3>
            <p>{tutorial.description}</p>
          </div>
          <div className="tutorial-video-meta">
            <span><Clock3 aria-hidden="true" size={16} /> Tutorial curto</span>
            <span><Captions aria-hidden="true" size={16} /> Legendas em português</span>
          </div>
        </div>

        <div className="tutorial-video-frame">
          <video controls preload="metadata" playsInline aria-label={`Tutorial: ${tutorial.title}`}>
            <source src={`${base}.webm`} type="video/webm" />
            <source src={`${base}.mp4`} type="video/mp4" />
            Seu navegador não oferece suporte à reprodução deste tutorial.
          </video>
        </div>

        <p className="tutorial-video-note">
          A gravação utiliza exclusivamente dados fictícios e sanitizados.
        </p>
      </article>;
      })}
      </div>
    </section>
  );
}
