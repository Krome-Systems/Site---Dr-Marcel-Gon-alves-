"use client";

import { FormEvent, useMemo, useState } from "react";

type TestDefinition = {
  slug: string;
  title: string;
  description: string;
  time: string;
  active: boolean;
  questions?: { id: string; text: string; weight: number }[];
};

const tests: TestDefinition[] = [
  {
    slug: "tdah",
    title: "TDAH em adultos",
    description: "Observe padrões de atenção, organização e impulsividade no cotidiano.",
    time: "4 min",
    active: true,
    questions: [
      { id: "focus", text: "Com frequência, você perde o foco em tarefas longas ou repetitivas?", weight: 1 },
      { id: "details", text: "Você costuma cometer erros por distração, mesmo quando conhece bem a tarefa?", weight: 1 },
      { id: "listen", text: "É difícil acompanhar uma conversa até o fim sem a mente se afastar?", weight: 1 },
      { id: "organize", text: "Organizar prazos, objetos e compromissos costuma exigir um esforço desproporcional?", weight: 2 },
      { id: "delay", text: "Você adia atividades que exigem concentração contínua, mesmo quando são importantes?", weight: 1 },
      { id: "restless", text: "Em momentos de espera, você sente inquietação ou necessidade de fazer várias coisas ao mesmo tempo?", weight: 1 },
      { id: "impulse", text: "Você interrompe pessoas ou toma decisões antes de conseguir pensar nas consequências?", weight: 2 },
      { id: "history", text: "Padrões parecidos já estavam presentes na infância ou adolescência?", weight: 2 },
    ],
  },
  { slug: "depressao", title: "Depressão", description: "Reflita sobre humor, energia e interesse nas últimas semanas.", time: "3 min", active: false },
  { slug: "ansiedade", title: "Ansiedade", description: "Perceba a frequência e o impacto de preocupações persistentes.", time: "3 min", active: false },
  { slug: "bipolar", title: "Transtorno bipolar", description: "Observe oscilações marcantes de energia, sono e humor.", time: "5 min", active: false },
  { slug: "panico", title: "Transtorno do pânico", description: "Reveja episódios súbitos de medo e sintomas físicos intensos.", time: "3 min", active: false },
  { slug: "autismo", title: "Autismo em adultos", description: "Explore padrões de interação, sensibilidade e rotina.", time: "5 min", active: false },
];

type TestStep = "intro" | "questions" | "email" | "result";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [step, setStep] = useState<TestStep>("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const activeTest = tests[0];
  const questions = activeTest.questions ?? [];

  const score = useMemo(
    () => questions.reduce((total, question) => total + (answers[question.id] ? question.weight : 0), 0),
    [answers, questions],
  );
  const maxScore = questions.reduce((total, question) => total + question.weight, 0);
  const ratio = maxScore ? score / maxScore : 0;
  const result = ratio < 0.34
    ? { label: "Poucos sinais neste rastreio", className: "low", text: "Suas respostas indicaram poucos sinais associados ao TDAH neste momento." }
    : ratio < 0.67
      ? { label: "Alguns sinais merecem atenção", className: "medium", text: "Suas respostas sugerem sinais que podem ser compreendidos melhor em uma avaliação profissional." }
      : { label: "Sinais relevantes para avaliação", className: "high", text: "Suas respostas indicam sinais relevantes e pode ser útil conversar com um profissional qualificado." };

  function openTest() {
    setTestOpen(true);
    setStep("intro");
    setQuestionIndex(0);
    setAnswers({});
    document.body.style.overflow = "hidden";
  }

  function closeTest() {
    setTestOpen(false);
    document.body.style.overflow = "";
  }

  function beginTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep("questions");
  }

  function answer(value: boolean) {
    const current = questions[questionIndex];
    setAnswers((previous) => ({ ...previous, [current.id]: value }));
    if (questionIndex === questions.length - 1) setStep("email");
    else setQuestionIndex((index) => index + 1);
  }

  function revealResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep("result");
  }

  const progress = step === "questions" ? ((questionIndex + 1) / questions.length) * 100 : step === "email" || step === "result" ? 100 : 0;

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Instituto Dr. Marcel Gonçalves — início">
          <span className="brand-mark">IM</span>
          <span><strong>Instituto</strong><small>Dr. Marcel Gonçalves</small></span>
        </a>
        <button className="menu-button" type="button" aria-expanded={menuOpen} aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span />
        </button>
        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Navegação principal">
          <a href="#instituto" onClick={() => setMenuOpen(false)}>O Instituto</a>
          <a href="#triagens" onClick={() => setMenuOpen(false)}>Triagens</a>
          <a href="#sobre" onClick={() => setMenuOpen(false)}>Dr. Marcel</a>
          <a href="#legal" onClick={() => setMenuOpen(false)}>Sobre os testes</a>
          <a className="nav-cta" href="#agendar" onClick={() => setMenuOpen(false)}>Agendar consulta</a>
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <span className="eyebrow">Psiquiatria com profundidade clínica e cuidado real</span>
          <h1>Diagnóstico cuidadoso,<br /><em>sem rótulos apressados.</em></h1>
          <p>Um espaço seguro para compreender o que você sente, encontrar clareza e decidir seus próximos passos com acolhimento.</p>
          <div className="hero-actions">
            <button className="button primary" type="button" onClick={openTest}>Começar uma triagem <span aria-hidden="true">→</span></button>
            <a className="text-link" href="#sobre">Conheça o Dr. Marcel</a>
          </div>
          <div className="hero-note"><span aria-hidden="true">✦</span> Leva poucos minutos · Privado · Sem diagnóstico automático</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="shape shape-one" />
          <div className="shape shape-two" />
          <div className="hero-card">
            <span className="hero-card-number">01</span>
            <p>Escuta qualificada</p>
            <span>Entender antes de nomear.</span>
          </div>
          <div className="hero-quote">“Cada história pede<br />um olhar inteiro.”</div>
        </div>
      </section>

      <section className="trust-bar" aria-label="Credenciais">
        <div><strong>CRM-BA 47156</strong><span>Registro profissional</span></div>
        <div><strong>Hospital Israelita Albert Einstein</strong><span>Pós-graduação em Psiquiatria</span></div>
        <div><strong>Atendimento humanizado</strong><span>Online e presencial</span></div>
      </section>

      <section className="intro-section" id="instituto">
        <span className="section-index">01 — O Instituto</span>
        <div>
          <h2>Clareza começa quando você se sente verdadeiramente ouvido.</h2>
          <p>O Instituto Dr. Marcel Gonçalves nasce para aproximar informação responsável, autoconhecimento e cuidado psiquiátrico. Sem simplificar a sua história a um rótulo.</p>
        </div>
        <aside><span>Nosso princípio</span><strong>Investigar com rigor.<br />Acolher com presença.</strong></aside>
      </section>

      <section className="tests-section" id="triagens">
        <div className="section-heading">
          <div><span className="section-index">02 — Triagens</span><h2>Um primeiro olhar para o que você está sentindo.</h2></div>
          <p>Nossos questionários ajudam a organizar sinais e perceber quando vale buscar avaliação. Eles não substituem uma consulta médica.</p>
        </div>
        <div className="test-grid">
          {tests.map((test, index) => (
            <article className={test.active ? "test-card active" : "test-card"} key={test.slug}>
              <div className="test-meta"><span>{String(index + 1).padStart(2, "0")}</span><span>{test.time}</span></div>
              <h3>{test.title}</h3>
              <p>{test.description}</p>
              {test.active ? (
                <button type="button" onClick={openTest}>Iniciar triagem <span aria-hidden="true">↗</span></button>
              ) : <span className="soon">Em breve</span>}
            </article>
          ))}
        </div>
        <p className="legal-line"><span aria-hidden="true">ⓘ</span> Instrumentos de rastreio, não de diagnóstico. Leia nosso <a href="#legal">aviso sobre os testes</a>.</p>
      </section>

      <section className="about-section" id="sobre">
        <div className="doctor-portrait" aria-label="Espaço reservado para retrato e vídeo institucional">
          <div className="portrait-monogram">MG</div>
          <button type="button" aria-label="Vídeo institucional em produção"><span aria-hidden="true">▶</span> Vídeo institucional<br /><small>em produção</small></button>
        </div>
        <div className="about-copy">
          <span className="section-index">03 — Dr. Marcel Gonçalves</span>
          <h2>Conhecimento técnico.<br /><em>Presença humana.</em></h2>
          <p>Dr. Marcel é médico psiquiatra e conduz cada avaliação como ela deve ser: com tempo, escuta e investigação cuidadosa da história de cada pessoa.</p>
          <blockquote>“Meu papel não é encaixar você em uma definição. É compreender o que está acontecendo e construir, junto com você, um caminho possível.”</blockquote>
          <div className="credentials">
            <div><span>Formação</span><strong>Pós-graduado em Psiquiatria</strong><small>Hospital Israelita Albert Einstein</small></div>
            <div><span>Registro</span><strong>CRM-BA 47156</strong><small>Médico psiquiatra</small></div>
          </div>
          <a className="text-link" href="#agendar">Conversar sobre uma consulta →</a>
        </div>
      </section>

      <section className="legal-section" id="legal">
        <span className="section-index">04 — Sobre os testes</span>
        <div>
          <h2>Informação responsável também é cuidado.</h2>
          <p>As triagens deste site são instrumentos educativos de rastreio. O resultado expressa apenas uma indicação baseada nas respostas informadas e nunca representa diagnóstico médico.</p>
        </div>
        <ul>
          <li>Não substitui avaliação clínica individual.</li>
          <li>Não recomenda ou altera medicação.</li>
          <li>Em caso de urgência, procure um serviço de emergência.</li>
        </ul>
      </section>

      <section className="booking-section" id="agendar">
        <span className="section-index light">05 — Próximo passo</span>
        <h2>Você não precisa entender tudo sozinho.</h2>
        <p>Se algo tem causado sofrimento ou interferido na sua rotina, uma conversa cuidadosa pode ajudar.</p>
        <a className="button ivory" href="https://wa.me/?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20uma%20consulta%20com%20o%20Dr.%20Marcel." target="_blank" rel="noreferrer">Agendar pelo WhatsApp <span aria-hidden="true">↗</span></a>
        <small>Atendimento por mensagem · Retorno em horário comercial</small>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark">IM</span><span><strong>Instituto</strong><small>Dr. Marcel Gonçalves</small></span></div>
        <div><span>Navegação</span><a href="#instituto">O Instituto</a><a href="#triagens">Triagens</a><a href="#sobre">Dr. Marcel</a></div>
        <div><span>Contato</span><a href="#agendar">WhatsApp</a><a href="#">Instagram</a><small>CRM-BA 47156</small></div>
        <p>© 2026 Instituto Dr. Marcel Gonçalves.<br />Conteúdo informativo. Não substitui avaliação médica.</p>
      </footer>

      {testOpen && (
        <div className="test-overlay" role="dialog" aria-modal="true" aria-labelledby="test-title">
          <div className="test-shell">
            <div className="test-topbar">
              <a className="brand compact" href="#inicio" onClick={(event) => event.preventDefault()}><span className="brand-mark">IM</span><span><strong>Instituto</strong><small>Dr. Marcel</small></span></a>
              <button type="button" onClick={closeTest} aria-label="Fechar triagem">Fechar ×</button>
            </div>
            <div className="progress-track" aria-label={`Progresso: ${Math.round(progress)}%`}><span style={{ width: `${progress}%` }} /></div>
            <div className="test-content">
              {step === "intro" && (
                <form onSubmit={beginTest}>
                  <span className="test-kicker">Triagem · TDAH em adultos</span>
                  <h2 id="test-title">Vamos olhar para esses sinais com calma?</h2>
                  <p>São 8 perguntas sobre experiências comuns de atenção, organização e impulsividade. Responda pensando no seu cotidiano, não apenas em um dia difícil.</p>
                  <label htmlFor="name">Como podemos chamar você? <small>(opcional)</small></label>
                  <input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu primeiro nome" autoFocus />
                  <button className="button primary" type="submit">Começar agora →</button>
                  <div className="test-disclaimer"><strong>Antes de começar</strong><span>Esta triagem não oferece diagnóstico e não substitui uma avaliação médica.</span></div>
                </form>
              )}

              {step === "questions" && questions[questionIndex] && (
                <div className="question-panel">
                  <span className="test-kicker">Pergunta {questionIndex + 1} de {questions.length}</span>
                  <h2 id="test-title">{name ? `${name}, ` : ""}{questions[questionIndex].text.charAt(0).toLowerCase() + questions[questionIndex].text.slice(1)}</h2>
                  <p>Não existe resposta certa. Escolha a opção que mais se aproxima da sua experiência habitual.</p>
                  <div className="answer-grid">
                    <button type="button" onClick={() => answer(false)}><span>Não</span><small>Isso raramente acontece comigo</small></button>
                    <button type="button" onClick={() => answer(true)}><span>Sim</span><small>Isso acontece com frequência</small></button>
                  </div>
                  {questionIndex > 0 && <button className="back-button" type="button" onClick={() => setQuestionIndex((index) => index - 1)}>← Pergunta anterior</button>}
                </div>
              )}

              {step === "email" && (
                <form onSubmit={revealResult}>
                  <span className="test-kicker">Triagem concluída</span>
                  <h2 id="test-title">Seu resumo está pronto.</h2>
                  <p>Informe seu e-mail para liberar o resultado. O envio automático será ativado na integração final do Instituto.</p>
                  <label htmlFor="email">Seu melhor e-mail</label>
                  <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" autoFocus />
                  <button className="button primary" type="submit">Ver meu resultado →</button>
                  <small className="privacy">Seus dados não são armazenados nesta demonstração.</small>
                </form>
              )}

              {step === "result" && (
                <div className="result-panel">
                  <span className="test-kicker">Seu resultado de rastreio</span>
                  <div className={`result-orbit ${result.className}`}><span>{Math.round(ratio * 100)}%</span><small>índice de sinais<br />neste rastreio</small></div>
                  <h2 id="test-title">{result.label}</h2>
                  <p>{name ? `${name}, s` : "S"}{result.text.slice(1)} Isso não confirma nem descarta TDAH.</p>
                  <div className="result-warning"><strong>Este resultado não é um diagnóstico.</strong><span>Somente uma avaliação médica completa pode considerar sua história, contexto e outros fatores.</span></div>
                  <a className="button primary" href="https://wa.me/?text=Ol%C3%A1%2C%20conclu%C3%AD%20a%20triagem%20de%20TDAH%20e%20gostaria%20de%20conversar%20sobre%20uma%20avalia%C3%A7%C3%A3o." target="_blank" rel="noreferrer">Conversar com a equipe →</a>
                  <button className="back-button" type="button" onClick={closeTest}>Voltar ao Instituto</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
