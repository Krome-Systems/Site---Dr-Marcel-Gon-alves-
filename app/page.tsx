"use client";

import { useMemo, useState } from "react";
import {
  ADHD_ITEMS,
  GAD7_ITEMS,
  IMPAIRMENT_AREAS,
  evaluateAdhd,
  evaluateGad7,
  type AdhdAnswer,
} from "../lib/triage";

type TestSlug = "tdah" | "ansiedade";
type ModalStep = "intro" | "questions" | "context" | "result";

const testCards = [
  { slug: "tdah" as const, title: "TDAH em adultos", description: "Organize sinais atuais, lembranças da infância e impactos na vida cotidiana.", time: "8–12 min", active: true },
  { slug: "ansiedade" as const, title: "Ansiedade", description: "Observe a frequência de sintomas de ansiedade nas últimas duas semanas.", time: "2–3 min", active: true },
  { slug: "depressao", title: "Depressão", description: "Reflita sobre humor, energia e interesse nas últimas semanas.", time: "3 min", active: false },
  { slug: "bipolar", title: "Transtorno bipolar", description: "Observe oscilações marcantes de energia, sono e humor.", time: "5 min", active: false },
];

const frequencyOptions = [
  { value: 0, label: "Nunca ou raramente" },
  { value: 1, label: "Às vezes" },
  { value: 2, label: "Frequentemente" },
  { value: 3, label: "Muito frequentemente" },
];

const gadOptions = [
  { value: 0, label: "Nenhuma vez" },
  { value: 1, label: "Vários dias" },
  { value: 2, label: "Mais da metade dos dias" },
  { value: 3, label: "Quase todos os dias" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTest, setActiveTest] = useState<TestSlug | null>(null);
  const [step, setStep] = useState<ModalStep>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [adhdAnswers, setAdhdAnswers] = useState<Record<string, AdhdAnswer>>({});
  const [gadAnswers, setGadAnswers] = useState<number[]>([]);
  const [impairments, setImpairments] = useState<string[]>([]);
  const [onsetBefore12, setOnsetBefore12] = useState<"no" | "unsure" | "yes">("unsure");
  const [durationSixMonths, setDurationSixMonths] = useState(false);
  const [functionalImpact, setFunctionalImpact] = useState(0);

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "5571993622929";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Olá, gostaria de saber mais sobre uma consulta com o Dr. Marcel.")}`;

  const adhdResult = useMemo(
    () => evaluateAdhd(adhdAnswers, impairments.length, onsetBefore12, durationSixMonths),
    [adhdAnswers, impairments.length, onsetBefore12, durationSixMonths],
  );
  const gadResult = useMemo(() => evaluateGad7(gadAnswers), [gadAnswers]);

  const totalQuestions = activeTest === "tdah" ? ADHD_ITEMS.length : GAD7_ITEMS.length;
  const progress = step === "intro" ? 0 : step === "questions" ? ((questionIndex + 1) / (totalQuestions + 1)) * 100 : step === "context" ? 94 : 100;

  function openTest(slug: TestSlug) {
    setActiveTest(slug);
    setStep("intro");
    setQuestionIndex(0);
    setAdhdAnswers({});
    setGadAnswers([]);
    setImpairments([]);
    setOnsetBefore12("unsure");
    setDurationSixMonths(false);
    setFunctionalImpact(0);
    document.body.style.overflow = "hidden";
  }

  function closeTest() {
    setActiveTest(null);
    document.body.style.overflow = "";
  }

  function nextAdhdQuestion() {
    if (questionIndex === ADHD_ITEMS.length - 1) setStep("context");
    else setQuestionIndex((index) => index + 1);
  }

  function answerGad(value: number) {
    const next = [...gadAnswers];
    next[questionIndex] = value;
    setGadAnswers(next);
    if (questionIndex === GAD7_ITEMS.length - 1) setStep("context");
    else setQuestionIndex((index) => index + 1);
  }

  function toggleImpairment(id: string) {
    setImpairments((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const currentAdhdItem = ADHD_ITEMS[questionIndex];
  const currentAdhdAnswer = currentAdhdItem ? adhdAnswers[currentAdhdItem.id] : undefined;
  const resultMessage = activeTest === "tdah"
    ? adhdResult.level === "high"
      ? "As respostas formam um conjunto de sinais que merece avaliação clínica especializada."
      : adhdResult.level === "medium"
        ? "Alguns eixos importantes apareceram, mas o conjunto não permite concluir a causa desses sinais."
        : "O padrão informado não atingiu os principais eixos desta triagem. Isso não descarta dificuldades ou TDAH."
    : gadResult.score >= 10
      ? "A intensidade informada sugere que vale conversar com um profissional de saúde."
      : "O resultado ajuda a acompanhar sintomas, mas não confirma nem exclui um transtorno de ansiedade.";

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Instituto Dr. Marcel Gonçalves — início">
          <span className="brand-mark">IM</span><span><strong>Instituto</strong><small>Dr. Marcel Gonçalves</small></span>
        </a>
        <button className="menu-button" type="button" aria-expanded={menuOpen} aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Navegação principal">
          <a href="#instituto">O Instituto</a><a href="#triagens">Triagens</a><a href="#sobre">Dr. Marcel</a><a href="#legal">Sobre os testes</a>
          <a className="nav-cta" href="#agendar">Agendar consulta</a>
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <span className="eyebrow">Psiquiatria online com profundidade clínica e cuidado real</span>
          <h1>Diagnóstico cuidadoso,<br /><em>sem rótulos apressados.</em></h1>
          <p>Escuta qualificada, raciocínio clínico e tratamento individualizado para adultos em qualquer lugar do Brasil.</p>
          <div className="hero-actions"><button className="button primary" type="button" onClick={() => openTest("tdah")}>Começar uma triagem <span aria-hidden="true">→</span></button><a className="text-link" href="#sobre">Conheça o Dr. Marcel</a></div>
          <div className="hero-note"><span aria-hidden="true">✦</span> Privado no seu dispositivo · Sem diagnóstico automático</div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="shape shape-one" /><div className="shape shape-two" /><div className="hero-card"><span className="hero-card-number">01</span><p>Escuta qualificada</p><span>Entender antes de nomear.</span></div><div className="hero-quote">“Cada história pede<br />um olhar inteiro.”</div></div>
      </section>

      <section className="trust-bar" aria-label="Credenciais">
        <div><strong>CRM-BA 47156</strong><span>Registro profissional</span></div>
        <div><strong>Hospital Israelita Albert Einstein</strong><span>Pós-graduação em Psiquiatria</span></div>
        <div><strong>Atendimento 100% online</strong><span>Em qualquer lugar do Brasil</span></div>
      </section>

      <section className="intro-section" id="instituto">
        <span className="section-index">01 — O Instituto</span>
        <div><h2>Clareza começa quando você se sente verdadeiramente ouvido.</h2><p>O Instituto aproxima informação responsável, autoconhecimento e cuidado psiquiátrico. O atendimento combina diagnóstico cuidadoso, prescrição responsável e acompanhamento contínuo.</p></div>
        <aside><span>Nosso princípio</span><strong>Investigar com rigor.<br />Acolher com presença.</strong></aside>
      </section>

      <section className="tests-section" id="triagens">
        <div className="section-heading"><div><span className="section-index">02 — Triagens</span><h2>Um primeiro olhar, com critérios claros.</h2></div><p>As respostas ficam apenas neste navegador e não são enviadas ao Instituto. Use o resumo para organizar uma conversa clínica.</p></div>
        <div className="test-grid">
          {testCards.map((test, index) => <article className={test.active ? "test-card active" : "test-card"} key={test.slug}>
            <div className="test-meta"><span>{String(index + 1).padStart(2, "0")}</span><span>{test.time}</span></div><h3>{test.title}</h3><p>{test.description}</p>
            {test.active ? <button type="button" onClick={() => openTest(test.slug as TestSlug)}>Iniciar triagem <span aria-hidden="true">↗</span></button> : <span className="soon">Em breve</span>}
          </article>)}
        </div>
        <p className="legal-line"><span aria-hidden="true">ⓘ</span> Rastreio não é diagnóstico. A avaliação considera entrevista, história, contexto e diagnósticos diferenciais.</p>
      </section>

      <section className="about-section" id="sobre">
        <div className="doctor-portrait" aria-label="Espaço reservado para retrato institucional"><div className="portrait-monogram">MG</div><div className="portrait-label">Atendimento médico<br /><small>online e individualizado</small></div></div>
        <div className="about-copy"><span className="section-index">03 — Dr. Marcel Gonçalves</span><h2>Conhecimento técnico.<br /><em>Presença humana.</em></h2><p>Médico pós-graduado em Psiquiatria pelo Hospital Israelita Albert Einstein, com base sólida em Clínica Médica, experiência no manejo de casos complexos e atendimento centrado no paciente.</p><blockquote>“Visão médica integral, com escuta e acompanhamento real.”</blockquote><div className="credentials"><div><span>Abordagem</span><strong>Diagnóstico responsável</strong><small>Sem automatismos ou generalizações</small></div><div><span>Disponibilidade</span><strong>Segunda a sexta</strong><small>Das 08:00 às 18:00</small></div></div><a className="text-link" href="#agendar">Conversar sobre uma consulta →</a></div>
      </section>

      <section className="legal-section" id="legal">
        <span className="section-index">04 — Sobre os testes</span><div><h2>Informação responsável também é cuidado.</h2><p>A triagem de TDAH foi estruturada a partir dos eixos investigados em uma avaliação clínica de adultos: sintomas atuais, história infantil, duração e prejuízo. Ela não é a entrevista DIVA‑5 e não reproduz seu conteúdo protegido.</p></div>
        <ul><li>O DIVA‑5 formal é uma entrevista diagnóstica conduzida por profissional.</li><li>O GAD‑7 mede frequência de sintomas nas últimas duas semanas.</li><li>Nenhum resultado recomenda ou altera medicação.</li><li>Em risco imediato, ligue 192 ou procure uma emergência. Apoio emocional: CVV 188.</li></ul>
      </section>

      <section className="booking-section" id="agendar"><span className="section-index light">05 — Próximo passo</span><h2>Você não precisa entender tudo sozinho.</h2><p>Se algo tem causado sofrimento ou interferido na sua rotina, uma conversa cuidadosa pode ajudar.</p><a className="button ivory" href={whatsappUrl} target="_blank" rel="noreferrer">Agendar pelo WhatsApp <span aria-hidden="true">↗</span></a><small>Atendimento por mensagem · Segunda a sexta, 08:00–18:00</small></section>

      <footer><div className="brand footer-brand"><span className="brand-mark">IM</span><span><strong>Instituto</strong><small>Dr. Marcel Gonçalves</small></span></div><div><span>Navegação</span><a href="#instituto">O Instituto</a><a href="#triagens">Triagens</a><a href="#sobre">Dr. Marcel</a></div><div><span>Contato</span><a href={whatsappUrl}>WhatsApp</a><a href="https://instagram.com/drmarcelgoncalves" target="_blank" rel="noreferrer">Instagram</a><small>CRM-BA 47156</small></div><p>© 2026 Instituto Dr. Marcel Gonçalves.<br />CNPJ 58.322.492/0001-11 · Conteúdo informativo.</p></footer>

      {activeTest && <div className="test-overlay" role="dialog" aria-modal="true" aria-labelledby="test-title">
        <div className="test-shell"><div className="test-topbar"><span className="brand compact"><span className="brand-mark">IM</span><span><strong>Instituto</strong><small>Dr. Marcel</small></span></span><button type="button" onClick={closeTest} aria-label="Fechar triagem">Fechar ×</button></div><div className="progress-track" aria-label={`Progresso: ${Math.round(progress)}%`}><span style={{ width: `${progress}%` }} /></div>
          <div className="test-content">
            {step === "intro" && <div className="test-intro"><span className="test-kicker">Triagem · {activeTest === "tdah" ? "TDAH em adultos" : "Ansiedade"}</span><h2 id="test-title">{activeTest === "tdah" ? "Uma investigação em quatro eixos." : "Como você esteve nas últimas duas semanas?"}</h2><p>{activeTest === "tdah" ? "Você responderá sobre 18 grupos de sinais na vida adulta e na infância, além de duração e impacto. Reserve alguns minutos e, se possível, consulte alguém que conheceu você antes dos 12 anos." : "O GAD‑7 reúne sete perguntas sobre a frequência de sintomas de ansiedade. O resultado é um rastreio de intensidade, não um diagnóstico."}</p><button className="button primary" type="button" onClick={() => setStep("questions")}>Começar agora →</button><div className="test-disclaimer"><strong>Antes de começar</strong><span>Suas respostas não saem deste dispositivo. Esta triagem não substitui avaliação médica.</span></div></div>}

            {step === "questions" && activeTest === "tdah" && currentAdhdItem && <div className="question-panel"><span className="test-kicker">{currentAdhdItem.domain === "attention" ? "Atenção" : "Hiperatividade e impulsividade"} · {questionIndex + 1} de {ADHD_ITEMS.length}</span><h2 id="test-title">{currentAdhdItem.prompt}</h2><p>{currentAdhdItem.example}</p><fieldset><legend>Na vida adulta, considerando os últimos 6 meses:</legend><div className="scale-grid">{frequencyOptions.map((option) => <button className={currentAdhdAnswer?.adult === option.value ? "selected" : ""} type="button" key={option.value} onClick={() => setAdhdAnswers((current) => ({ ...current, [currentAdhdItem.id]: { adult: option.value, childhood: current[currentAdhdItem.id]?.childhood || "unsure" } }))}>{option.label}</button>)}</div></fieldset><fieldset><legend>Entre 5 e 12 anos, havia um padrão parecido?</legend><div className="scale-grid three">{([['no','Não'],['unsure','Não sei'],['yes','Sim']] as const).map(([value,label]) => <button className={currentAdhdAnswer?.childhood === value ? "selected" : ""} type="button" key={value} onClick={() => setAdhdAnswers((current) => ({ ...current, [currentAdhdItem.id]: { adult: current[currentAdhdItem.id]?.adult ?? -1, childhood: value } }))}>{label}</button>)}</div></fieldset><div className="question-nav">{questionIndex > 0 && <button className="back-button" type="button" onClick={() => setQuestionIndex((index) => index - 1)}>← Anterior</button>}<button className="button primary compact-button" type="button" disabled={!currentAdhdAnswer || currentAdhdAnswer.adult < 0} onClick={nextAdhdQuestion}>{questionIndex === ADHD_ITEMS.length - 1 ? "Revisar impacto →" : "Próxima →"}</button></div></div>}

            {step === "questions" && activeTest === "ansiedade" && <div className="question-panel"><span className="test-kicker">Pergunta {questionIndex + 1} de {GAD7_ITEMS.length}</span><h2 id="test-title">Com que frequência você foi incomodado por:</h2><p className="question-focus">{GAD7_ITEMS[questionIndex]}?</p><div className="answer-list">{gadOptions.map((option) => <button type="button" key={option.value} onClick={() => answerGad(option.value)}><span>{option.label}</span><small>{option.value} ponto{option.value === 1 ? "" : "s"}</small></button>)}</div>{questionIndex > 0 && <button className="back-button" type="button" onClick={() => setQuestionIndex((index) => index - 1)}>← Pergunta anterior</button>}</div>}

            {step === "context" && activeTest === "tdah" && <div className="context-panel"><span className="test-kicker">Contexto e impacto</span><h2 id="test-title">Esses sinais interferem na sua vida?</h2><p>Marque todas as áreas em que há prejuízo relevante. A avaliação clínica procura evidência em dois ou mais contextos.</p><div className="check-grid">{IMPAIRMENT_AREAS.map((area) => <label key={area.id}><input type="checkbox" checked={impairments.includes(area.id)} onChange={() => toggleImpairment(area.id)} /><span>{area.label}</span></label>)}</div><fieldset><legend>Vários sinais já estavam presentes antes dos 12 anos?</legend><div className="scale-grid three">{([['no','Não'],['unsure','Não sei'],['yes','Sim']] as const).map(([value,label]) => <button className={onsetBefore12 === value ? "selected" : ""} type="button" key={value} onClick={() => setOnsetBefore12(value)}>{label}</button>)}</div></fieldset><label className="confirm-line"><input type="checkbox" checked={durationSixMonths} onChange={(event) => setDurationSixMonths(event.target.checked)} /><span>Os sinais atuais persistem há pelo menos 6 meses, e não apenas em episódios isolados.</span></label><button className="button primary full-button" type="button" onClick={() => setStep("result")}>Ver resumo →</button></div>}

            {step === "context" && activeTest === "ansiedade" && <div className="context-panel"><span className="test-kicker">Impacto funcional</span><h2 id="test-title">Quanto esses sintomas dificultaram sua rotina?</h2><p>Considere trabalho, estudos, tarefas de casa e convivência com outras pessoas.</p><div className="answer-list">{["Não dificultaram", "Dificultaram um pouco", "Dificultaram muito", "Dificultaram extremamente"].map((label, value) => <button type="button" key={label} className={functionalImpact === value ? "selected" : ""} onClick={() => setFunctionalImpact(value)}><span>{label}</span></button>)}</div><button className="button primary full-button" type="button" onClick={() => setStep("result")}>Ver resultado →</button></div>}

            {step === "result" && <div className="result-panel"><span className="test-kicker">Resumo da triagem</span>{activeTest === "tdah" ? <><h2 id="test-title">{adhdResult.level === "high" ? "Avaliação profissional recomendada" : adhdResult.level === "medium" ? "Alguns eixos merecem atenção" : "Padrão não evidente nesta triagem"}</h2><p>{resultMessage}</p><div className="result-breakdown"><div><strong>{adhdResult.adultAttention}/9</strong><span>Sinais atuais de atenção</span></div><div><strong>{adhdResult.adultHyperactivity}/9</strong><span>Sinais atuais de hiperatividade/impulsividade</span></div><div><strong>{adhdResult.childhoodAttention + adhdResult.childhoodHyperactivity}</strong><span>Sinais lembrados na infância</span></div><div><strong>{impairments.length}/5</strong><span>Áreas com prejuízo</span></div></div><ul className="criteria-list"><li className={adhdResult.adultThreshold ? "met" : ""}>Limiar de sinais atuais em pelo menos um domínio</li><li className={adhdResult.childhoodPattern ? "met" : ""}>Vários sinais informados antes dos 12 anos</li><li className={adhdResult.crossContextImpairment ? "met" : ""}>Prejuízo informado em dois ou mais contextos</li><li className={adhdResult.durationSixMonths ? "met" : ""}>Persistência atual por pelo menos 6 meses</li></ul></> : <><div className={`score-orbit ${gadResult.level}`}><strong>{gadResult.score}</strong><span>de 21 pontos</span></div><h2 id="test-title">{gadResult.label}</h2><p>{resultMessage} Impacto informado: {functionalImpact === 0 ? "nenhum" : functionalImpact === 1 ? "um pouco" : functionalImpact === 2 ? "muito" : "extremo"}.</p></>}<div className="result-warning"><strong>Este resultado não é um diagnóstico.</strong><span>Sintomas podem ter diferentes causas. Uma avaliação completa inclui história clínica, outras condições, sono, substâncias, medicações e contexto de vida.</span></div><a className="button primary full-button" href={whatsappUrl} target="_blank" rel="noreferrer">Conversar com a equipe →</a><button className="back-button" type="button" onClick={closeTest}>Voltar ao Instituto</button></div>}
          </div>
        </div>
      </div>}
    </main>
  );
}
