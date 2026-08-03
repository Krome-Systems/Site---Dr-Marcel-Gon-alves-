"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  ADHD_ITEMS,
  BIPOLAR_ITEMS,
  GAD7_ITEMS,
  IMPAIRMENT_AREAS,
  PHQ9_ITEMS,
  evaluateAdhd,
  evaluateBipolarScreen,
  evaluateGad7,
  evaluatePhq9,
  type AdhdAnswer,
  type BipolarAnswer,
} from "../lib/triage";
import { downloadResultPdf } from "../lib/result-pdf";
import type { ResultReport } from "../lib/result-report";

type TestSlug = "tdah" | "ansiedade" | "depressao" | "bipolar";
type ModalStep = "intro" | "questions" | "context" | "result";
type DeliveryStatus = "idle" | "sending" | "sent" | "error";

const testCards = [
  { slug: "tdah" as const, title: "TDAH em adultos", description: "Organize sinais atuais, lembranças da infância e impactos na vida cotidiana.", time: "8–12 min", active: true },
  { slug: "ansiedade" as const, title: "Ansiedade", description: "Observe a frequência de sintomas de ansiedade nas últimas duas semanas.", time: "2–3 min", active: true },
  { slug: "depressao" as const, title: "Depressão", description: "Observe humor, energia, sono e interesse nas últimas duas semanas.", time: "3–4 min", active: true },
  { slug: "bipolar" as const, title: "Sinais de bipolaridade", description: "Revise períodos marcantes de energia, sono, humor e impulsividade.", time: "5–7 min", active: true },
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
  const [phqAnswers, setPhqAnswers] = useState<number[]>([]);
  const [bipolarAnswers, setBipolarAnswers] = useState<Record<string, BipolarAnswer>>({});
  const [impairments, setImpairments] = useState<string[]>([]);
  const [onsetBefore12, setOnsetBefore12] = useState<"no" | "unsure" | "yes">("unsure");
  const [durationSixMonths, setDurationSixMonths] = useState(false);
  const [functionalImpact, setFunctionalImpact] = useState<number | null>(null);
  const [bipolarConcurrent, setBipolarConcurrent] = useState<"no" | "yes" | null>(null);
  const [resultEmail, setResultEmail] = useState("");
  const [emailConsent, setEmailConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>("idle");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "5571993622929";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Olá, gostaria de saber mais sobre uma consulta com o Dr. Marcel.")}`;
  const emailDeliveryAvailable = process.env.NEXT_PUBLIC_STATIC_EXPORT !== "1";

  const adhdResult = useMemo(
    () => evaluateAdhd(adhdAnswers, impairments.length, onsetBefore12, durationSixMonths),
    [adhdAnswers, impairments.length, onsetBefore12, durationSixMonths],
  );
  const gadResult = useMemo(() => evaluateGad7(gadAnswers), [gadAnswers]);
  const phqResult = useMemo(() => evaluatePhq9(phqAnswers), [phqAnswers]);
  const bipolarResult = useMemo(
    () => evaluateBipolarScreen(bipolarAnswers, bipolarConcurrent === "yes", functionalImpact ?? 0),
    [bipolarAnswers, bipolarConcurrent, functionalImpact],
  );

  const totalQuestions = activeTest === "tdah"
    ? ADHD_ITEMS.length
    : activeTest === "ansiedade"
      ? GAD7_ITEMS.length
      : activeTest === "depressao"
        ? PHQ9_ITEMS.length
        : BIPOLAR_ITEMS.length;
  const progress = step === "intro" ? 0 : step === "questions" ? ((questionIndex + 1) / (totalQuestions + 1)) * 100 : step === "context" ? 94 : 100;

  function openTest(slug: TestSlug) {
    setActiveTest(slug);
    setStep("intro");
    setQuestionIndex(0);
    setAdhdAnswers({});
    setGadAnswers([]);
    setPhqAnswers([]);
    setBipolarAnswers({});
    setImpairments([]);
    setOnsetBefore12("unsure");
    setDurationSixMonths(false);
    setFunctionalImpact(null);
    setBipolarConcurrent(null);
    setResultEmail("");
    setEmailConsent(false);
    setWebsite("");
    setDeliveryStatus("idle");
    setDeliveryMessage("");
    setPdfBusy(false);
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

  function answerPhq(value: number) {
    const next = [...phqAnswers];
    next[questionIndex] = value;
    setPhqAnswers(next);
    if (questionIndex === PHQ9_ITEMS.length - 1) setStep("context");
    else setQuestionIndex((index) => index + 1);
  }

  function answerBipolar(value: BipolarAnswer) {
    setBipolarAnswers((current) => ({ ...current, [String(questionIndex)]: value }));
    if (questionIndex === BIPOLAR_ITEMS.length - 1) setStep("context");
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
    : activeTest === "ansiedade" && gadResult.score >= 10
      ? "A intensidade informada sugere que vale conversar com um profissional de saúde."
      : activeTest === "ansiedade"
        ? "O resultado ajuda a acompanhar sintomas, mas não confirma nem exclui um transtorno de ansiedade."
        : activeTest === "depressao" && phqResult.score >= 10
          ? "A intensidade informada indica que uma avaliação profissional pode ajudar a compreender esses sintomas."
          : activeTest === "depressao"
            ? "O resultado organiza sintomas recentes, mas não confirma nem exclui depressão."
            : bipolarResult.patternPresent
              ? "As respostas formam um padrão de rastreio que deve ser explorado em avaliação clínica."
              : "O resultado organiza sinais de períodos de humor e energia, mas não confirma nem exclui transtorno bipolar.";

  const introCopy = {
    tdah: {
      kicker: "TDAH em adultos",
      title: "Uma investigação em quatro eixos.",
      description: "Você responderá sobre 18 grupos de sinais na vida adulta e na infância, além de duração e impacto. Reserve alguns minutos e, se possível, consulte alguém que conheceu você antes dos 12 anos.",
    },
    ansiedade: {
      kicker: "Ansiedade",
      title: "Como você esteve nas últimas duas semanas?",
      description: "O GAD‑7 reúne sete perguntas sobre a frequência de sintomas de ansiedade. O resultado é um rastreio de intensidade, não um diagnóstico.",
    },
    depressao: {
      kicker: "Sintomas depressivos",
      title: "Como você esteve nas últimas duas semanas?",
      description: "O PHQ‑9 organiza a frequência de nove sintomas depressivos e seu impacto. A pontuação indica intensidade para orientar uma conversa clínica; não determina diagnóstico.",
    },
    bipolar: {
      kicker: "Sinais de bipolaridade",
      title: "Você já viveu períodos muito diferentes do seu habitual?",
      description: "Esta triagem segue a estrutura do MDQ: reúne sinais ao longo da vida e verifica se ocorreram no mesmo período e se trouxeram prejuízo. Ela não diagnostica transtorno bipolar.",
    },
  }[activeTest ?? "tdah"];
  const impactLabel = functionalImpact === 0
    ? "nenhum"
    : functionalImpact === 1
      ? "um pouco"
      : functionalImpact === 2
        ? "muito"
        : "extremo";

  function createResultReport(): ResultReport | null {
    if (!activeTest) return null;
    const generatedAt = new Date().toISOString();

    if (activeTest === "tdah") {
      const headline = adhdResult.level === "high"
        ? "Avaliação profissional recomendada"
        : adhdResult.level === "medium"
          ? "Alguns eixos merecem atenção"
          : "Padrão não evidente nesta triagem";
      return {
        test: "TDAH em adultos",
        generatedAt,
        headline,
        summary: resultMessage,
        details: [
          `${adhdResult.adultAttention}/9 sinais atuais de atenção`,
          `${adhdResult.adultHyperactivity}/9 sinais atuais de hiperatividade ou impulsividade`,
          `${adhdResult.childhoodAttention + adhdResult.childhoodHyperactivity} sinais lembrados na infância`,
          `${impairments.length}/5 áreas com prejuízo informado`,
          `Persistência por pelo menos 6 meses: ${adhdResult.durationSixMonths ? "informada" : "não informada"}`,
        ],
      };
    }

    if (activeTest === "ansiedade") return {
      test: "Ansiedade",
      generatedAt,
      headline: gadResult.label,
      summary: resultMessage,
      score: `${gadResult.score} de 21 pontos`,
      details: [`Impacto funcional informado: ${impactLabel}`],
    };

    if (activeTest === "depressao") return {
      test: "Sintomas depressivos",
      generatedAt,
      headline: phqResult.label,
      summary: resultMessage,
      score: `${phqResult.score} de 27 pontos`,
      details: [`Impacto funcional informado: ${impactLabel}`],
      ...(phqResult.safetyFollowUp ? {
        safetyNotice: "Foi informada alguma frequência de pensamentos relacionados a morte ou autoagressão. Em risco imediato, ligue 192 ou procure uma emergência. Para apoio emocional, ligue 188. Mesmo sem risco imediato, converse com um profissional o quanto antes.",
      } : {}),
    };

    return {
      test: "Sinais de bipolaridade",
      generatedAt,
      headline: bipolarResult.label,
      summary: resultMessage,
      details: [
        `${bipolarResult.symptomCount}/13 sinais informados ao longo da vida`,
        `Vários sinais no mesmo período: ${bipolarResult.concurrent ? "sim" : "não"}`,
        `Problema moderado ou grave: ${bipolarResult.significantImpact ? "sim" : "não"}`,
      ],
    };
  }

  async function handlePdfDownload() {
    const report = createResultReport();
    if (!report || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadResultPdf(report);
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleEmailDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const report = createResultReport();
    if (!report || deliveryStatus === "sending") return;
    if (!emailConsent) {
      setDeliveryStatus("error");
      setDeliveryMessage("Confirme o consentimento para enviar o resumo.");
      return;
    }

    setDeliveryStatus("sending");
    setDeliveryMessage("");
    try {
      const response = await fetch("/api/send-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resultEmail, consent: true, website, report }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Não foi possível enviar o resumo.");
      setDeliveryStatus("sent");
      setDeliveryMessage("Resumo enviado. Confira também a caixa de spam.");
    } catch (error) {
      setDeliveryStatus("error");
      setDeliveryMessage(error instanceof Error ? error.message : "Não foi possível enviar o resumo.");
    }
  }

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
            {test.active ? <button type="button" onClick={() => openTest(test.slug)}>Iniciar triagem <span aria-hidden="true">↗</span></button> : <span className="soon">Em breve</span>}
          </article>)}
        </div>
        <p className="legal-line"><span aria-hidden="true">ⓘ</span> Rastreio não é diagnóstico. A avaliação considera entrevista, história, contexto e diagnósticos diferenciais.</p>
      </section>

      <section className="about-section" id="sobre">
        <div className="doctor-portrait" aria-label="Espaço reservado para retrato institucional"><div className="portrait-monogram">MG</div><div className="portrait-label">Atendimento médico<br /><small>online e individualizado</small></div></div>
        <div className="about-copy"><span className="section-index">03 — Dr. Marcel Gonçalves</span><h2>Conhecimento técnico.<br /><em>Presença humana.</em></h2><p>Médico pós-graduado em Psiquiatria pelo Hospital Israelita Albert Einstein, com base sólida em Clínica Médica, experiência no manejo de casos complexos e atendimento centrado no paciente.</p><blockquote>“Visão médica integral, com escuta e acompanhamento real.”</blockquote><div className="credentials"><div><span>Abordagem</span><strong>Diagnóstico responsável</strong><small>Sem automatismos ou generalizações</small></div><div><span>Disponibilidade</span><strong>Segunda a sexta</strong><small>Das 08:00 às 18:00</small></div></div><a className="text-link" href="#agendar">Conversar sobre uma consulta →</a></div>
      </section>

      <section className="legal-section" id="legal">
        <span className="section-index">04 — Sobre os testes</span><div><h2>Informação responsável também é cuidado.</h2><p>A triagem de TDAH preserva os eixos clínicos do DIVA‑5: sinais atuais, história infantil, duração e prejuízo. Depressão e bipolaridade são avaliadas em módulos próprios porque o DIVA‑5 não investiga outros transtornos psiquiátricos.</p></div>
        <ul><li>O DIVA‑5 formal é uma entrevista diagnóstica conduzida por profissional e não é reproduzido aqui.</li><li>GAD‑7 e PHQ‑9 medem a frequência de sintomas nas últimas duas semanas.</li><li>A triagem de bipolaridade segue os eixos de sintomas, simultaneidade e prejuízo do MDQ.</li><li>Nenhum resultado fecha diagnóstico, recomenda ou altera medicação.</li><li>Em risco imediato, ligue 192 ou procure uma emergência. Apoio emocional: CVV 188.</li></ul>
      </section>

      <section className="booking-section" id="agendar"><span className="section-index light">05 — Próximo passo</span><h2>Você não precisa entender tudo sozinho.</h2><p>Se algo tem causado sofrimento ou interferido na sua rotina, uma conversa cuidadosa pode ajudar.</p><a className="button ivory" href={whatsappUrl} target="_blank" rel="noreferrer">Agendar pelo WhatsApp <span aria-hidden="true">↗</span></a><small>Atendimento por mensagem · Segunda a sexta, 08:00–18:00</small></section>

      <footer><div className="brand footer-brand"><span className="brand-mark">IM</span><span><strong>Instituto</strong><small>Dr. Marcel Gonçalves</small></span></div><div><span>Navegação</span><a href="#instituto">O Instituto</a><a href="#triagens">Triagens</a><a href="#sobre">Dr. Marcel</a></div><div><span>Contato</span><a href={whatsappUrl}>WhatsApp</a><a href="https://instagram.com/drmarcelgoncalves" target="_blank" rel="noreferrer">Instagram</a><small>CRM-BA 47156</small></div><p>© 2026 Instituto Dr. Marcel Gonçalves.<br />CNPJ 58.322.492/0001-11 · Conteúdo informativo.</p></footer>

      {activeTest && <div className="test-overlay" role="dialog" aria-modal="true" aria-labelledby="test-title">
        <div className="test-shell"><div className="test-topbar"><span className="brand compact"><span className="brand-mark">IM</span><span><strong>Instituto</strong><small>Dr. Marcel</small></span></span><button type="button" onClick={closeTest} aria-label="Fechar triagem">Fechar ×</button></div><div className="progress-track" aria-label={`Progresso: ${Math.round(progress)}%`}><span style={{ width: `${progress}%` }} /></div>
          <div className="test-content">
            {step === "intro" && <div className="test-intro"><span className="test-kicker">Triagem · {introCopy.kicker}</span><h2 id="test-title">{introCopy.title}</h2><p>{introCopy.description}</p><button className="button primary" type="button" onClick={() => setStep("questions")}>Começar agora →</button><div className="test-disclaimer"><strong>Antes de começar</strong><span>Suas respostas não saem deste dispositivo. Esta triagem não substitui avaliação médica.</span></div></div>}

            {step === "questions" && activeTest === "tdah" && currentAdhdItem && <div className="question-panel"><span className="test-kicker">{currentAdhdItem.domain === "attention" ? "Atenção" : "Hiperatividade e impulsividade"} · {questionIndex + 1} de {ADHD_ITEMS.length}</span><h2 id="test-title">{currentAdhdItem.prompt}</h2><p>{currentAdhdItem.example}</p><fieldset><legend>Na vida adulta, considerando os últimos 6 meses:</legend><div className="scale-grid">{frequencyOptions.map((option) => <button className={currentAdhdAnswer?.adult === option.value ? "selected" : ""} type="button" key={option.value} onClick={() => setAdhdAnswers((current) => ({ ...current, [currentAdhdItem.id]: { adult: option.value, childhood: current[currentAdhdItem.id]?.childhood || "unsure" } }))}>{option.label}</button>)}</div></fieldset><fieldset><legend>Entre 5 e 12 anos, havia um padrão parecido?</legend><div className="scale-grid three">{([['no','Não'],['unsure','Não sei'],['yes','Sim']] as const).map(([value,label]) => <button className={currentAdhdAnswer?.childhood === value ? "selected" : ""} type="button" key={value} onClick={() => setAdhdAnswers((current) => ({ ...current, [currentAdhdItem.id]: { adult: current[currentAdhdItem.id]?.adult ?? -1, childhood: value } }))}>{label}</button>)}</div></fieldset><div className="question-nav">{questionIndex > 0 && <button className="back-button" type="button" onClick={() => setQuestionIndex((index) => index - 1)}>← Anterior</button>}<button className="button primary compact-button" type="button" disabled={!currentAdhdAnswer || currentAdhdAnswer.adult < 0} onClick={nextAdhdQuestion}>{questionIndex === ADHD_ITEMS.length - 1 ? "Revisar impacto →" : "Próxima →"}</button></div></div>}

            {step === "questions" && activeTest === "ansiedade" && <div className="question-panel"><span className="test-kicker">Pergunta {questionIndex + 1} de {GAD7_ITEMS.length}</span><h2 id="test-title">Com que frequência você foi incomodado por:</h2><p className="question-focus">{GAD7_ITEMS[questionIndex]}?</p><div className="answer-list">{gadOptions.map((option) => <button type="button" key={option.value} onClick={() => answerGad(option.value)}><span>{option.label}</span><small>{option.value} ponto{option.value === 1 ? "" : "s"}</small></button>)}</div>{questionIndex > 0 && <button className="back-button" type="button" onClick={() => setQuestionIndex((index) => index - 1)}>← Pergunta anterior</button>}</div>}

            {step === "questions" && activeTest === "depressao" && <div className="question-panel"><span className="test-kicker">Pergunta {questionIndex + 1} de {PHQ9_ITEMS.length}</span><h2 id="test-title">Nas últimas duas semanas, com que frequência você foi incomodado por:</h2><p className="question-focus">{PHQ9_ITEMS[questionIndex]}?</p><div className="answer-list">{gadOptions.map((option) => <button type="button" key={option.value} className={phqAnswers[questionIndex] === option.value ? "selected" : ""} onClick={() => answerPhq(option.value)}><span>{option.label}</span><small>{option.value} ponto{option.value === 1 ? "" : "s"}</small></button>)}</div>{questionIndex > 0 && <button className="back-button" type="button" onClick={() => setQuestionIndex((index) => index - 1)}>← Pergunta anterior</button>}</div>}

            {step === "questions" && activeTest === "bipolar" && <div className="question-panel"><span className="test-kicker">Experiências ao longo da vida · {questionIndex + 1} de {BIPOLAR_ITEMS.length}</span><h2 id="test-title">Você já teve um período em que:</h2><p className="question-focus">{BIPOLAR_ITEMS[questionIndex]}?</p><p>Considere uma mudança clara em relação ao seu jeito habitual, e não apenas um dia bom ou ruim.</p><div className="scale-grid two">{([['no','Não'],['yes','Sim']] as const).map(([value,label]) => <button className={bipolarAnswers[String(questionIndex)] === value ? "selected" : ""} type="button" key={value} onClick={() => answerBipolar(value)}>{label}</button>)}</div>{questionIndex > 0 && <button className="back-button" type="button" onClick={() => setQuestionIndex((index) => index - 1)}>← Pergunta anterior</button>}</div>}

            {step === "context" && activeTest === "tdah" && <div className="context-panel"><span className="test-kicker">Contexto e impacto</span><h2 id="test-title">Esses sinais interferem na sua vida?</h2><p>Marque todas as áreas em que há prejuízo relevante. A avaliação clínica procura evidência em dois ou mais contextos.</p><div className="check-grid">{IMPAIRMENT_AREAS.map((area) => <label key={area.id}><input type="checkbox" checked={impairments.includes(area.id)} onChange={() => toggleImpairment(area.id)} /><span>{area.label}</span></label>)}</div><fieldset><legend>Vários sinais já estavam presentes antes dos 12 anos?</legend><div className="scale-grid three">{([['no','Não'],['unsure','Não sei'],['yes','Sim']] as const).map(([value,label]) => <button className={onsetBefore12 === value ? "selected" : ""} type="button" key={value} onClick={() => setOnsetBefore12(value)}>{label}</button>)}</div></fieldset><label className="confirm-line"><input type="checkbox" checked={durationSixMonths} onChange={(event) => setDurationSixMonths(event.target.checked)} /><span>Os sinais atuais persistem há pelo menos 6 meses, e não apenas em episódios isolados.</span></label><button className="button primary full-button" type="button" onClick={() => setStep("result")}>Ver resumo →</button></div>}

            {step === "context" && (activeTest === "ansiedade" || activeTest === "depressao") && <div className="context-panel"><span className="test-kicker">Impacto funcional</span><h2 id="test-title">Quanto esses sintomas dificultaram sua rotina?</h2><p>Considere trabalho, estudos, tarefas de casa e convivência com outras pessoas.</p>{activeTest === "depressao" && phqResult.safetyFollowUp && <div className="safety-alert" role="alert"><strong>Sua segurança vem primeiro.</strong><span>Você informou pensamentos relacionados a morte ou autoagressão. Se houver risco de agir agora, ligue 192 ou vá a uma emergência. Para apoio emocional, ligue gratuitamente para o CVV no 188. Mesmo sem risco imediato, converse com um profissional o quanto antes.</span></div>}<div className="answer-list">{["Não dificultaram", "Dificultaram um pouco", "Dificultaram muito", "Dificultaram extremamente"].map((label, value) => <button type="button" key={label} className={functionalImpact === value ? "selected" : ""} onClick={() => setFunctionalImpact(value)}><span>{label}</span></button>)}</div><button className="button primary full-button" type="button" disabled={functionalImpact === null} onClick={() => setStep("result")}>Ver resultado →</button></div>}

            {step === "context" && activeTest === "bipolar" && <div className="context-panel"><span className="test-kicker">Padrão e impacto</span><h2 id="test-title">Como esses sinais aconteceram?</h2><fieldset><legend>Vários desses sinais ocorreram durante o mesmo período?</legend><div className="scale-grid two">{([['no','Não'],['yes','Sim']] as const).map(([value,label]) => <button className={bipolarConcurrent === value ? "selected" : ""} type="button" key={value} onClick={() => setBipolarConcurrent(value)}>{label}</button>)}</div></fieldset><fieldset><legend>Quanto esse período trouxe problemas, como conflitos, dificuldades no trabalho, gastos ou consequências legais?</legend><div className="answer-list">{["Nenhum problema", "Problema pequeno", "Problema moderado", "Problema grave"].map((label, value) => <button type="button" key={label} className={functionalImpact === value ? "selected" : ""} onClick={() => setFunctionalImpact(value)}><span>{label}</span></button>)}</div></fieldset><button className="button primary full-button" type="button" disabled={bipolarConcurrent === null || functionalImpact === null} onClick={() => setStep("result")}>Ver resumo →</button></div>}

            {step === "result" && <div className="result-panel">
              <span className="test-kicker">Resumo da triagem</span>
              {activeTest === "tdah" && <>
                <h2 id="test-title">{adhdResult.level === "high" ? "Avaliação profissional recomendada" : adhdResult.level === "medium" ? "Alguns eixos merecem atenção" : "Padrão não evidente nesta triagem"}</h2>
                <p>{resultMessage}</p>
                <div className="result-breakdown"><div><strong>{adhdResult.adultAttention}/9</strong><span>Sinais atuais de atenção</span></div><div><strong>{adhdResult.adultHyperactivity}/9</strong><span>Sinais atuais de hiperatividade/impulsividade</span></div><div><strong>{adhdResult.childhoodAttention + adhdResult.childhoodHyperactivity}</strong><span>Sinais lembrados na infância</span></div><div><strong>{impairments.length}/5</strong><span>Áreas com prejuízo</span></div></div>
                <ul className="criteria-list"><li className={adhdResult.adultThreshold ? "met" : ""}>Limiar de sinais atuais em pelo menos um domínio</li><li className={adhdResult.childhoodPattern ? "met" : ""}>Vários sinais informados antes dos 12 anos</li><li className={adhdResult.crossContextImpairment ? "met" : ""}>Prejuízo informado em dois ou mais contextos</li><li className={adhdResult.durationSixMonths ? "met" : ""}>Persistência atual por pelo menos 6 meses</li></ul>
              </>}
              {activeTest === "ansiedade" && <>
                <div className={`score-orbit ${gadResult.level}`}><strong>{gadResult.score}</strong><span>de 21 pontos</span></div>
                <h2 id="test-title">{gadResult.label}</h2><p>{resultMessage} Impacto informado: {impactLabel}.</p>
              </>}
              {activeTest === "depressao" && <>
                <div className={`score-orbit ${phqResult.level}`}><strong>{phqResult.score}</strong><span>de 27 pontos</span></div>
                <h2 id="test-title">{phqResult.label}</h2><p>{resultMessage} Impacto informado: {impactLabel}.</p>
                {phqResult.safetyFollowUp && <div className="safety-alert" role="alert"><strong>Procure apoio agora se você não estiver seguro.</strong><span>Em risco imediato, ligue 192 ou vá a uma emergência. O CVV oferece apoio emocional gratuito pelo 188. Uma resposta acima de zero neste item precisa ser conversada com um profissional, mesmo quando não há intenção de agir.</span></div>}
              </>}
              {activeTest === "bipolar" && <>
                <h2 id="test-title">{bipolarResult.label}</h2><p>{resultMessage}</p>
                <div className="result-breakdown three-columns"><div><strong>{bipolarResult.symptomCount}/13</strong><span>Sinais informados ao longo da vida</span></div><div><strong>{bipolarResult.concurrent ? "Sim" : "Não"}</strong><span>Vários no mesmo período</span></div><div><strong>{bipolarResult.significantImpact ? "Sim" : "Não"}</strong><span>Problema moderado ou grave</span></div></div>
                <ul className="criteria-list"><li className={bipolarResult.symptomThreshold ? "met" : ""}>Sete ou mais sinais informados</li><li className={bipolarResult.concurrent ? "met" : ""}>Sinais agrupados no mesmo período</li><li className={bipolarResult.significantImpact ? "met" : ""}>Consequências moderadas ou graves</li></ul>
              </>}
              <div className="result-warning"><strong>Este resultado não é um diagnóstico.</strong><span>Sintomas podem ter diferentes causas. Uma avaliação completa inclui história clínica, curso dos episódios, outras condições, sono, substâncias, medicações e contexto de vida.</span></div>
              <section className="result-save-card" aria-labelledby="save-result-title">
                <span className="result-save-index">Seu resumo</span>
                <h3 id="save-result-title">Guarde para levar à consulta.</h3>
                <p>Baixe o PDF agora ou receba uma cópia no seu e-mail. Não é necessário criar conta.</p>
                <button className="download-button" type="button" onClick={handlePdfDownload} disabled={pdfBusy}>
                  <span aria-hidden="true">↓</span><span><strong>{pdfBusy ? "Preparando PDF..." : "Baixar resumo em PDF"}</strong><small>Gerado neste dispositivo</small></span>
                </button>
                {emailDeliveryAvailable ? <><div className="save-divider"><span>ou envie por e-mail</span></div><form className="email-result-form" onSubmit={handleEmailDelivery}>
                  <label htmlFor="result-email">Seu e-mail</label>
                  <div className="email-field-row"><input id="result-email" type="email" inputMode="email" autoComplete="email" placeholder="voce@exemplo.com" required maxLength={254} value={resultEmail} onChange={(event) => { setResultEmail(event.target.value); setDeliveryStatus("idle"); setDeliveryMessage(""); }} /><button type="submit" disabled={deliveryStatus === "sending" || deliveryStatus === "sent"}>{deliveryStatus === "sending" ? "Enviando..." : deliveryStatus === "sent" ? "Enviado ✓" : "Enviar resumo →"}</button></div>
                  <div className="honeypot" aria-hidden="true"><label htmlFor="website">Não preencha</label><input id="website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></div>
                  <label className="email-consent"><input type="checkbox" checked={emailConsent} onChange={(event) => setEmailConsent(event.target.checked)} /><span>Concordo com o envio deste resumo ao e-mail informado. O site não armazena minhas respostas; o provedor de e-mail processa os dados somente para realizar a entrega.</span></label>
                  <p className={`delivery-message ${deliveryStatus}`} aria-live="polite">{deliveryMessage}</p>
                </form><small className="privacy-note">O e-mail é enviado somente para você. Durante a consulta, apresente o PDF ou a mensagem recebida.</small></> : <div className="static-email-note"><strong>Envio por e-mail disponível na versão completa.</strong><span>Nesta demonstração estática, baixe o PDF para guardar seu resumo com segurança.</span></div>}
              </section>
              <a className="button primary full-button" href={whatsappUrl} target="_blank" rel="noreferrer">Conversar com a equipe →</a><button className="back-button" type="button" onClick={closeTest}>Voltar ao Instituto</button>
            </div>}
          </div>
        </div>
      </div>}
    </main>
  );
}
