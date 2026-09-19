"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
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
type CareSlug = TestSlug | "dependencia-quimica" | "dependencia-alcoolica";
type ModalStep = "intro" | "questions" | "context" | "result";
type DeliveryStatus = "idle" | "sending" | "sent" | "error";

const careCards: Array<{ slug: CareSlug; title: string; description: string; signals: string }> = [
  { slug: "tdah", title: "TDAH em adultos", description: "Avaliação de desatenção, impulsividade, organização e impactos na vida adulta.", signals: "atenção · impulsividade" },
  { slug: "ansiedade", title: "Ansiedade e pânico", description: "Cuidado para sintomas de ansiedade, crises de pânico, tensão e preocupação persistente.", signals: "antecipação · tensão" },
  { slug: "depressao", title: "Depressão", description: "Avaliação de alterações de humor, energia, sono, interesse e funcionamento diário.", signals: "humor · energia" },
  { slug: "bipolar", title: "Transtorno bipolar", description: "Investigação médica de períodos de oscilação de humor, energia, sono e impulsividade.", signals: "oscilação · ciclos" },
  { slug: "dependencia-quimica", title: "Dependência química", description: "Acompanhamento relacionado ao uso de cocaína, crack, maconha, nicotina e outras substâncias.", signals: "substâncias · recaídas" },
  { slug: "dependencia-alcoolica", title: "Dependência de álcool", description: "Cuidado individualizado para quem percebe perda de controle, prejuízos ou recaídas com o álcool.", signals: "álcool · recuperação" },
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

const traceBars = [0.22, 0.82, 0.35, 0.95, 0.48, 0.72, 0.3, 0.88, 0.56, 1, 0.4, 0.68];
const depressaoBars = [1, 0.97, 0.93, 0.88, 0.84, 0.79, 0.75, 0.7, 0.66, 0.61, 0.57, 0.52];
const bipolarBars = [0.66, 0.78, 0.9, 1, 0.9, 0.78, 0.66, 0.78, 0.9, 1, 0.9, 0.78];

function traceShape(variant: CareSlug) {
  if (variant === "depressao") return depressaoBars;
  if (variant === "bipolar") return bipolarBars;
  if (variant === "dependencia-quimica") return [0.28, 0.52, 0.86, 0.42, 0.95, 0.62, 0.3, 0.78, 0.48, 1, 0.58, 0.35];
  if (variant === "dependencia-alcoolica") return [0.24, 0.38, 0.56, 0.76, 0.92, 1, 0.92, 0.76, 0.56, 0.38, 0.24, 0.16];
  return traceBars;
}

function traceDelay(variant: CareSlug, index: number) {
  if (variant === "depressao") return `${index * -0.28}s`;
  if (variant === "bipolar") return index < 6 ? `${index * -0.04}s` : `${-1 - (index - 6) * 0.04}s`;
  return `${index * -0.09}s`;
}

function SignalTrace({ variant }: { variant: CareSlug }) {
  return <div className={`signal-trace ${variant}`} aria-hidden="true">
    {traceShape(variant).map((height, index) => <span key={`${variant}-${index}`} style={{ "--bar-height": height, "--bar-delay": traceDelay(variant, index) } as CSSProperties} />)}
  </div>;
}

function ParticleBrain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    type Particle = { x: number; y: number; tx: number; ty: number; vx: number; vy: number; phase: number; speed: number; size: number; blue: boolean };
    let particles: Particle[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;
    let startedAt = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: -9999, y: -9999 };
    const noiseWords = wrap.querySelector<HTMLElement>(".noise-words");
    const hint = wrap.querySelector<HTMLElement>("small");

    const build = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(320, rect.width);
      height = Math.max(320, rect.height);
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const mask = document.createElement("canvas");
      mask.width = Math.max(1, Math.round(width));
      mask.height = Math.max(1, Math.round(height));
      const maskContext = mask.getContext("2d");
      if (!maskContext) return;
      maskContext.fillStyle = "#fff";
      maskContext.strokeStyle = "#fff";
      maskContext.lineJoin = "round";
      maskContext.lineCap = "round";

      const scale = Math.min(width, height) * 0.88;
      const point = (x: number, y: number): [number, number] => [
        width / 2 + (x - 0.5) * scale * 1.15,
        height / 2 + (y - 0.53) * scale * 0.95,
      ];
      const radii: Array<[number, number]> = [[0, 0.42], [0.5, 0.365], [1, 0.295], [1.57, 0.225], [2.1, 0.25], [2.6, 0.345], [Math.PI, 0.41], [3.7, 0.435], [4.2, 0.42], [4.71, 0.37], [5.2, 0.41], [5.75, 0.435], [Math.PI * 2, 0.42]];
      const baseRadius = (angle: number) => {
        const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        for (let index = 0; index < radii.length - 1; index += 1) {
          const current = radii[index];
          const next = radii[index + 1];
          if (normalized >= current[0] && normalized <= next[0]) {
            const progress = (normalized - current[0]) / (next[0] - current[0]);
            const smooth = progress * progress * (3 - 2 * progress);
            return current[1] * (1 - smooth) + next[1] * smooth;
          }
        }
        return 0.42;
      };
      const outlinePoint = (angle: number, radiusFactor = 1): [number, number] => {
        const folds = 1 + 0.05 * Math.sin(7 * angle + 0.6) + 0.027 * Math.sin(12 * angle + 2.4) + 0.013 * Math.sin(19 * angle + 1.1);
        const radius = baseRadius(angle) * folds * radiusFactor;
        return point(0.5 + Math.cos(angle) * radius, 0.45 + Math.sin(angle) * radius);
      };

      maskContext.beginPath();
      for (let index = 0; index <= 360; index += 1) {
        const position = outlinePoint(index / 360 * Math.PI * 2);
        if (index === 0) maskContext.moveTo(position[0], position[1]);
        else maskContext.lineTo(position[0], position[1]);
      }
      maskContext.closePath();
      maskContext.fill();

      const blob = (centerX: number, centerY: number, radiusX: number, radiusY: number, rotation: number, frequency: number, amplitude: number) => {
        maskContext.beginPath();
        for (let index = 0; index <= 220; index += 1) {
          const angle = index / 220 * Math.PI * 2;
          const variation = 1 + amplitude * Math.sin(frequency * angle + 1.3);
          const x = Math.cos(angle) * radiusX * variation;
          const y = Math.sin(angle) * radiusY * variation;
          const position = point(centerX + x * Math.cos(rotation) - y * Math.sin(rotation), centerY + x * Math.sin(rotation) + y * Math.cos(rotation));
          if (index === 0) maskContext.moveTo(position[0], position[1]);
          else maskContext.lineTo(position[0], position[1]);
        }
        maskContext.closePath();
        maskContext.fill();
      };

      blob(0.325, 0.625, 0.17, 0.098, -0.14, 9, 0.08);
      const cerebellumX = 0.745;
      const cerebellumY = 0.7;
      const cerebellumRadius = 0.13;
      blob(cerebellumX, cerebellumY, cerebellumRadius, cerebellumRadius * 0.76, 0.12, 12, 0.09);

      maskContext.lineWidth = scale * 0.062;
      const stemStart = point(0.595, 0.625);
      const stemCurve = point(0.605, 0.72);
      const stemEnd = point(0.645, 0.815);
      maskContext.beginPath();
      maskContext.moveTo(stemStart[0], stemStart[1]);
      maskContext.quadraticCurveTo(stemCurve[0], stemCurve[1], stemEnd[0], stemEnd[1]);
      maskContext.stroke();

      maskContext.globalCompositeOperation = "destination-out";
      maskContext.lineWidth = Math.max(2.6, scale * 0.028);
      const fissureStart = point(0.205, 0.545);
      const fissureCurve1 = point(0.36, 0.55);
      const fissureCurve2 = point(0.5, 0.515);
      const fissureEnd = point(0.585, 0.435);
      maskContext.beginPath();
      maskContext.moveTo(fissureStart[0], fissureStart[1]);
      maskContext.bezierCurveTo(fissureCurve1[0], fissureCurve1[1], fissureCurve2[0], fissureCurve2[1], fissureEnd[0], fissureEnd[1]);
      maskContext.stroke();

      const groove = (radiusFactor: number, start: number, end: number, amplitude: number, frequency: number) => {
        maskContext.beginPath();
        for (let index = 0; index <= 100; index += 1) {
          const angle = start + (end - start) * index / 100;
          const position = outlinePoint(angle, radiusFactor * (1 + amplitude * Math.sin(frequency * angle + 0.4)));
          if (index === 0) maskContext.moveTo(position[0], position[1]);
          else maskContext.lineTo(position[0], position[1]);
        }
        maskContext.stroke();
      };
      groove(0.76, -2.85, -0.35, 0.05, 5);
      groove(0.5, -2.62, -0.5, 0.07, 4);
      groove(0.86, -4.1, -3.4, 0.04, 6);

      const cerebellumArc = (radius: number, verticalScale: number, start: number, end: number, lineWidth: number) => {
        maskContext.lineWidth = lineWidth;
        maskContext.beginPath();
        for (let index = 0; index <= 80; index += 1) {
          const angle = start + (end - start) * index / 80;
          const position = point(cerebellumX + Math.cos(angle) * radius, cerebellumY + Math.sin(angle) * radius * verticalScale);
          if (index === 0) maskContext.moveTo(position[0], position[1]);
          else maskContext.lineTo(position[0], position[1]);
        }
        maskContext.stroke();
      };
      cerebellumArc(cerebellumRadius * 1.28, 0.82, Math.PI * 1.06, Math.PI * 1.92, Math.max(3, scale * 0.03));
      cerebellumArc(cerebellumRadius * 0.62, 0.8, Math.PI * 1.15, Math.PI * 1.85, Math.max(2.2, scale * 0.018));

      maskContext.lineWidth = Math.max(2.6, scale * 0.026);
      const lowerGrooveStart = point(0.225, 0.53);
      const lowerGrooveCurve = point(0.265, 0.6);
      const lowerGrooveEnd = point(0.225, 0.66);
      maskContext.beginPath();
      maskContext.moveTo(lowerGrooveStart[0], lowerGrooveStart[1]);
      maskContext.quadraticCurveTo(lowerGrooveCurve[0], lowerGrooveCurve[1], lowerGrooveEnd[0], lowerGrooveEnd[1]);
      maskContext.stroke();
      maskContext.globalCompositeOperation = "source-over";

      const pixels = maskContext.getImageData(0, 0, mask.width, mask.height).data;
      let spacing = Math.max(3, Math.round(width / 300));
      let points: Array<[number, number]> = [];
      for (let attempt = 0; attempt < 14; attempt += 1) {
        points = [];
        for (let y = 0; y < mask.height; y += spacing) {
          for (let x = 0; x < mask.width; x += spacing) {
            if (pixels[(y * mask.width + x) * 4 + 3] > 130) {
              points.push([x + (Math.random() - 0.5) * spacing * 0.7, y + (Math.random() - 0.5) * spacing * 0.7]);
            }
          }
        }
        if (points.length <= 2600) break;
        spacing += 1;
      }

      const previous = particles;
      particles = points.map(([tx, ty], index) => ({
        x: reducedMotion ? tx : previous[index]?.x ?? Math.random() * width,
        y: reducedMotion ? ty : previous[index]?.y ?? Math.random() * height,
        tx,
        ty,
        vx: 0,
        vy: 0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.55 + Math.random() * 0.95,
        size: Math.random() < 0.12 ? 2.2 : 1.4,
        blue: Math.random() < 0.22,
      }));
    };

    const draw = (now: number) => {
      context.clearRect(0, 0, width, height);
      const elapsed = (now - startedAt) / 1000;
      const settle = reducedMotion ? 1 : Math.min(1, Math.max(0, (elapsed - 1.45) / 2.9));
      const ease = settle * settle * (3 - 2 * settle);
      const stiffness = 0.01 + ease * 0.072;
      const damping = 0.905 - ease * 0.075;
      const chaos = 2.4 * (1 - ease) + 0.18;

      for (const particle of particles) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < 13000) {
          const distance = Math.sqrt(distanceSquared) || 1;
          const force = (1 - distanceSquared / 13000) * 2.2;
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;
        }
        particle.vx += (particle.tx - particle.x) * stiffness * particle.speed;
        particle.vy += (particle.ty - particle.y) * stiffness * particle.speed;
        particle.vx *= damping;
        particle.vy *= damping;
        if (!reducedMotion) {
          particle.x += particle.vx + Math.cos(elapsed * 1.5 + particle.phase) * chaos * 0.55;
          particle.y += particle.vy + Math.sin(elapsed * 1.25 + particle.phase * 1.7) * chaos * 0.55;
        }
        context.globalAlpha = particle.blue ? (0.26 + ease * 0.68) * 0.95 : 0.26 + ease * 0.68;
        context.fillStyle = particle.blue ? "#4C90FF" : "#F2F6FF";
        context.fillRect(particle.x, particle.y, particle.size, particle.size);
      }
      context.globalAlpha = 1;
      if (noiseWords) noiseWords.style.opacity = String(0.9 - ease * 0.84);
      if (hint) hint.style.opacity = String(0.06 + ease * 0.3);
      if (!reducedMotion) frame = requestAnimationFrame(draw);
    };

    const scatter = () => {
      startedAt = performance.now();
      for (const particle of particles) {
        particle.x = Math.random() * width;
        particle.y = Math.random() * height;
        particle.vx = (Math.random() - 0.5) * 5;
        particle.vy = (Math.random() - 0.5) * 5;
      }
      if (noiseWords) noiseWords.style.opacity = "0.9";
    };
    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const leave = () => { pointer.x = -9999; pointer.y = -9999; };

    build();
    if (reducedMotion) draw(performance.now());
    else frame = requestAnimationFrame(draw);
    const observer = new ResizeObserver(build);
    observer.observe(wrap);
    wrap.addEventListener("pointermove", move);
    wrap.addEventListener("pointerleave", leave);
    wrap.addEventListener("click", scatter);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      wrap.removeEventListener("pointermove", move);
      wrap.removeEventListener("pointerleave", leave);
      wrap.removeEventListener("click", scatter);
    };
  }, []);

  return <div className="brain-visual" ref={wrapRef}>
    <div className="noise-words" aria-hidden="true"><span>esqueci de novo</span><span>amanhã eu faço</span><span>não consigo parar</span><span>03:40 da manhã</span><span>muitas abas</span><span>onde deixei?</span></div>
    <canvas ref={canvasRef} aria-label="Ilustração interativa de sinais se organizando em um cérebro" />
    <small>clique para dispersar</small>
  </div>;
}

type ScrollStep = readonly [string, string, string];

function ScrollSteps({ steps, className, accent = "#0A66E8" }: { steps: readonly ScrollStep[]; className: string; accent?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rows = Array.from(wrap.querySelectorAll<HTMLElement>("article"));
    let animationFrame = 0;

    const update = () => {
      animationFrame = 0;
      const focus = window.innerHeight * 0.62;
      const bounds = wrap.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (focus - bounds.top) / Math.max(1, bounds.height * 0.88)));
      wrap.style.setProperty("--steps-progress", `${(progress * 100).toFixed(1)}%`);
      rows.forEach((row) => {
        const rowBounds = row.getBoundingClientRect();
        row.classList.toggle("active", rowBounds.top + rowBounds.height * 0.34 < focus);
      });
    };
    const requestUpdate = () => {
      if (!animationFrame) animationFrame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    update();
    const delayedUpdate = window.setTimeout(requestUpdate, 400);
    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(delayedUpdate);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return <div ref={wrapRef} className={`scroll-steps ${className}`} style={{ "--steps-accent": accent } as CSSProperties}>
    <span className="steps-rail" aria-hidden="true"><i /></span>
    {steps.map(([number, title, copy]) => <article key={number}>
      <i className="step-dot" aria-hidden="true" />
      <span className="step-number">{number}</span>
      <div><h3>{title}</h3><p>{copy}</p><i className="step-line" aria-hidden="true" /></div>
    </article>)}
  </div>;
}

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

  useEffect(() => {
    if (!activeTest) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [activeTest]);

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "5571993622929";
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Olá, gostaria de saber mais sobre uma consulta com o Dr. Marcel.")}`;
  const careWhatsappUrl = (care: string) => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá, gostaria de saber mais sobre o acompanhamento para ${care} com o Dr. Marcel.`)}`;
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
  }

  function closeTest() {
    setActiveTest(null);
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
      setDeliveryMessage("PDF enviado. Confira também a caixa de spam.");
    } catch (error) {
      setDeliveryStatus("error");
      setDeliveryMessage(error instanceof Error ? error.message : "Não foi possível enviar o resumo.");
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Instituto Dr. Marcel Gonçalves — início"><strong>Instituto</strong><span>Dr. Marcel Gonçalves</span></a>
        <button className="menu-button" type="button" aria-expanded={menuOpen} aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
        <nav className={menuOpen ? "nav open" : "nav"} aria-label="Navegação principal" onClick={() => setMenuOpen(false)}>
          <a href="#instituto">O Instituto</a><a href="#atuacao">Áreas de cuidado</a><a href="#sobre">Dr. Marcel</a><a href="#dependencia">Dependência e cuidado</a>
          <a className="nav-cta" href="#agendar">Agendar</a>
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-inner">
          <ParticleBrain />
          <div className="hero-copy">
            <span className="eyebrow"><i /> Cuidado médico em saúde mental · Adultos · Todo o Brasil</span>
            <h1>Diagnóstico cuidadoso, sem rótulos apressados.</h1>
            <p>Escuta qualificada, raciocínio clínico e tratamento individualizado. O ruído vira leitura clínica — e a leitura clínica vira um plano.</p>
            <div className="hero-actions"><a className="button primary" href={whatsappUrl} target="_blank" rel="noreferrer">Conversar pelo WhatsApp</a><a className="button secondary" href="#sobre">Conheça o Dr. Marcel</a></div>
            <small className="hero-note">Atendimento individualizado · Consulta 100% online</small>
          </div>
        </div>
      </section>

      <section className="intro-section" id="instituto">
        <div className="section-shell">
          <div className="section-label"><span>O INSTITUTO</span></div>
          <h2>Clareza começa quando você se sente <em>verdadeiramente ouvido.</em></h2>
          <p className="section-lead">O Instituto aproxima informação responsável, autoconhecimento e cuidado médico em saúde mental — diagnóstico cuidadoso, prescrição responsável e acompanhamento contínuo.</p>
          <ScrollSteps className="principles" steps={[["01","Escuta antes do rótulo","A história completa vem primeiro. O nome do quadro vem depois — e só quando se sustenta."],["02","Prescrição responsável","Cada conduta é explicada, revisada e ajustada junto com você — nunca no automático."],["03","Acompanhamento real","Tratamento é processo. O retorno faz parte do cuidado, não é exceção."]]} />
        </div>
      </section>

      <section className="tests-section" id="atuacao">
        <div className="section-shell">
          <div className="section-label centered"><span>ÁREAS DE CUIDADO</span></div>
          <h2>Cada pessoa precisa de uma escuta própria.</h2>
          <p className="section-lead centered">Avaliação médica e acompanhamento individualizado para diferentes necessidades de saúde mental, dependência e comportamento.</p>
          <div className="test-grid">
            {careCards.map((care, index) => <article className={`test-card ${care.slug}`} key={care.slug}>
              <div className="test-meta"><span>ACOMPANHAMENTO</span><small>{String(index + 1).padStart(2, "0")}</small></div>
              <SignalTrace variant={care.slug} />
              <h3>{care.title}</h3><p>{care.description}</p>
              <div className="test-card-action"><span>{care.signals}</span><a href={careWhatsappUrl(care.title)} target="_blank" rel="noreferrer">Conversar <b aria-hidden="true">→</b></a></div>
            </article>)}
          </div>
          <p className="legal-line">O cuidado começa com uma avaliação individual da história, dos sintomas, do contexto familiar e dos tratamentos anteriores.</p>
        </div>
      </section>

      <section className="about-section" id="sobre">
        <div className="section-shell about-grid">
          <div className="doctor-portrait"><img src="/dr-marcel.png" alt="Dr. Marcel Gonçalves" width={1122} height={1402} loading="lazy" decoding="async" /></div>
          <div className="about-copy"><span className="about-kicker">CONHECIMENTO TÉCNICO. PRESENÇA HUMANA.</span><h2>Dr. Marcel<br />Gonçalves</h2><p className="doctor-role">Médico <i /> <span>CRM-BA 47156</span></p><p>Médico com pós-graduação em Psiquiatria pelo Hospital Israelita Albert Einstein, base sólida em Clínica Médica, experiência no manejo de casos complexos e atendimento centrado no paciente.</p><blockquote>“Visão médica integral, com escuta e acompanhamento real.”</blockquote><div className="credentials"><div><span>REGISTRO</span><strong>CRM-BA 47156</strong><small>Bahia · Brasil</small></div><div><span>FORMAÇÃO</span><strong>Pós-graduação em Psiquiatria</strong><small>Hospital Israelita Albert Einstein</small></div></div><a className="button primary" href="#agendar">Conversar sobre uma consulta</a></div>
        </div>
      </section>

      <section className="legal-section" id="dependencia">
        <div className="section-shell">
          <div className="section-label centered muted-label"><span>DEPENDÊNCIA E COMPORTAMENTO ADITIVO</span></div>
          <h2>Cuidado amplo para uma condição complexa.</h2>
          <p className="section-lead centered">A dependência não deve ser vista apenas como falta de força de vontade. O acompanhamento considera aspectos biológicos, psicológicos, familiares, sociais e comportamentais.</p>
          <ScrollSteps className="method-list" accent="#6E7FA8" steps={[["01","Álcool e outras substâncias","Avaliação e acompanhamento relacionados ao uso de álcool, cocaína, crack, maconha, tabaco, nicotina, múltiplas drogas e outras substâncias psicoativas."],["02","Comportamentos aditivos","Cuidado para uso excessivo ou descontrolado de jogos online, videogames, apostas e outros comportamentos compulsivos que prejudicam a vida cotidiana."],["03","Saúde mental e comorbidades","A avaliação também investiga ansiedade, depressão, pânico, transtorno bipolar, alterações do sono, irritabilidade, impulsividade e outros quadros associados."],["04","Tratamento individualizado","Planejamento terapêutico, avaliação medicamentosa quando indicada, prevenção de recaídas, orientação à família e continuidade do cuidado após clínicas ou comunidades terapêuticas."]]} />
          <div className="care-callout"><span>PROCURAR AJUDA É O COMEÇO DE UMA MUDANÇA POSSÍVEL</span><h3>Quando o uso ou o comportamento ocupa um espaço maior do que deveria, uma avaliação pode ajudar.</h3><p>O trabalho é construir, junto com cada paciente, uma estratégia de cuidado que considere sua realidade, seus sintomas e seus objetivos.</p><a className="button primary" href={whatsappUrl} target="_blank" rel="noreferrer">Falar com o Dr. Marcel pelo WhatsApp</a></div>
          <div className="emergency-card"><div><span>RISCO IMEDIATO</span><h3>Se houver risco à vida, busque ajuda agora.</h3><p>Uma emergência não deve esperar uma consulta agendada. Ligue ou vá ao serviço de urgência mais próximo.</p></div><div><a href="tel:192">SAMU 192 <small>LIGAR</small></a><a href="tel:188">CVV 188 <small>APOIO 24H</small></a></div></div>
        </div>
      </section>

      <section className="booking-section" id="agendar"><div className="section-shell"><h2>Você não precisa entender tudo sozinho.</h2><p>Se algo tem causado sofrimento ou interferido na sua rotina, uma conversa cuidadosa pode ajudar.</p><div className="booking-card"><span className="availability"><i /> Resposta no mesmo dia útil</span><strong>Mande uma mensagem. A primeira conversa já organiza o próximo passo.</strong><a href={whatsappUrl} target="_blank" rel="noreferrer">Agendar pelo WhatsApp <span aria-hidden="true">→</span></a><div><span>Sigilo médico</span><span>Consulta 100% online</span><span>Seg a sex · 08:00–18:00</span></div></div></div></section>

      <footer><div className="section-shell footer-grid"><div><strong>Instituto Dr. Marcel Gonçalves</strong><p>Cuidado médico em saúde mental, dependência química e comportamentos aditivos, com escuta qualificada e acompanhamento real.</p></div><div><span>Navegação</span><a href="#instituto">O Instituto</a><a href="#atuacao">Áreas de cuidado</a><a href="#sobre">Dr. Marcel</a><a href="#dependencia">Dependência e cuidado</a></div><div><span>Contato</span><a href={whatsappUrl}>WhatsApp</a><a href="https://instagram.com/drmarcelgoncalves" target="_blank" rel="noreferrer">Instagram</a><small>Médico · CRM-BA 47156</small></div></div><div className="footer-bottom"><span>© 2026 Instituto Dr. Marcel Gonçalves</span><span>CNPJ 58.322.492/0001-11 · Conteúdo informativo</span></div></footer>

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
                <p>Baixe o PDF agora ou receba o arquivo anexado no seu e-mail. Não é necessário criar conta.</p>
                <button className="download-button" type="button" onClick={handlePdfDownload} disabled={pdfBusy}>
                  <span aria-hidden="true">↓</span><span><strong>{pdfBusy ? "Preparando PDF..." : "Baixar resumo em PDF"}</strong><small>Gerado neste dispositivo</small></span>
                </button>
                {emailDeliveryAvailable ? <><div className="save-divider"><span>ou envie por e-mail</span></div><form className="email-result-form" onSubmit={handleEmailDelivery}>
                  <label htmlFor="result-email">Seu e-mail</label>
                  <div className="email-field-row"><input id="result-email" type="email" inputMode="email" autoComplete="email" placeholder="voce@exemplo.com" required maxLength={254} value={resultEmail} onChange={(event) => { setResultEmail(event.target.value); setDeliveryStatus("idle"); setDeliveryMessage(""); }} /><button type="submit" disabled={deliveryStatus === "sending" || deliveryStatus === "sent"}>{deliveryStatus === "sending" ? "Gerando e enviando..." : deliveryStatus === "sent" ? "Enviado ✓" : "Enviar PDF →"}</button></div>
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
