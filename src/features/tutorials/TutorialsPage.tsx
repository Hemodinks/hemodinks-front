import { BarChart3, Captions, Clock3, PlayCircle } from 'lucide-react';
import './tutorials-page.css';

const REPORTS_VIDEO = {
  title: 'Relatórios — consulta analítica',
  description: 'Aprenda a combinar filtros, consultar os indicadores e conferir os resultados detalhados.',
  duration: '1 min 52 s',
  webm: '/tutorials/reports/tutorial-relatorios-narrado.webm',
  mp4: '/tutorials/reports/tutorial-relatorios-narrado.mp4',
};

export function TutorialsPage() {
  return (
    <section className="workspace tutorials-library" aria-labelledby="tutorials-title">
      <header className="tutorials-library-header">
        <div>
          <span className="eyebrow">Central de aprendizagem</span>
          <h2 id="tutorials-title">Tutoriais interativos</h2>
          <p>Assista às demonstrações gravadas e pratique os fluxos com segurança dentro do Hemodinks.</p>
        </div>
        <div className="tutorials-library-count" aria-label="1 tutorial disponível">
          <PlayCircle aria-hidden="true" size={22} />
          <strong>1</strong>
          <span>disponível</span>
        </div>
      </header>

      <article className="tutorial-video-card">
        <div className="tutorial-video-heading">
          <div className="tutorial-video-icon" aria-hidden="true">
            <BarChart3 size={24} />
          </div>
          <div>
            <span className="eyebrow">Faturamento</span>
            <h3>{REPORTS_VIDEO.title}</h3>
            <p>{REPORTS_VIDEO.description}</p>
          </div>
          <div className="tutorial-video-meta">
            <span><Clock3 aria-hidden="true" size={16} /> {REPORTS_VIDEO.duration}</span>
            <span><Captions aria-hidden="true" size={16} /> Legendas em português</span>
          </div>
        </div>

        <div className="tutorial-video-frame">
          <video controls preload="metadata" playsInline aria-label={`Tutorial: ${REPORTS_VIDEO.title}`}>
            <source src={REPORTS_VIDEO.webm} type="video/webm" />
            <source src={REPORTS_VIDEO.mp4} type="video/mp4" />
            Seu navegador não oferece suporte à reprodução deste tutorial.
          </video>
        </div>

        <p className="tutorial-video-note">
          A gravação utiliza exclusivamente dados fictícios e sanitizados.
        </p>
      </article>
    </section>
  );
}
