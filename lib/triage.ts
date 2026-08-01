export type AdhdDomain = "attention" | "hyperactivity";

export type AdhdAnswer = {
  adult: number;
  childhood: "no" | "unsure" | "yes";
};

export type AdhdItem = {
  id: string;
  domain: AdhdDomain;
  prompt: string;
  example: string;
};

export const ADHD_ITEMS: AdhdItem[] = [
  { id: "a1", domain: "attention", prompt: "Você deixa passar detalhes ou comete erros por distração?", example: "Pense em trabalho, estudos, tarefas domésticas e mensagens importantes." },
  { id: "a2", domain: "attention", prompt: "É difícil manter a atenção até o fim de uma tarefa ou conversa?", example: "Considere atividades longas, repetitivas ou pouco estimulantes." },
  { id: "a3", domain: "attention", prompt: "As pessoas percebem que você parece não escutar quando falam diretamente com você?", example: "Mesmo quando não há uma distração evidente ao redor." },
  { id: "a4", domain: "attention", prompt: "Você começa tarefas, mas perde etapas ou tem dificuldade para concluí-las?", example: "Considere obrigações profissionais, acadêmicas e de casa." },
  { id: "a5", domain: "attention", prompt: "Organizar prazos, prioridades e objetos costuma ser difícil?", example: "Pense em agenda, documentos, rotina e administração do tempo." },
  { id: "a6", domain: "attention", prompt: "Você evita ou adia tarefas que exigem esforço mental por bastante tempo?", example: "Como relatórios, leituras, formulários ou organização financeira." },
  { id: "a7", domain: "attention", prompt: "Você perde com frequência objetos necessários para suas atividades?", example: "Como chaves, carteira, documentos, celular ou materiais de trabalho." },
  { id: "a8", domain: "attention", prompt: "Estímulos ao redor ou pensamentos paralelos desviam facilmente sua atenção?", example: "Considere ruídos, notificações, movimento e ideias que surgem no momento." },
  { id: "a9", domain: "attention", prompt: "Você esquece compromissos ou tarefas habituais com frequência?", example: "Como contas, retornos, horários, recados ou itens da rotina." },
  { id: "h1", domain: "hyperactivity", prompt: "Você mexe mãos ou pés, muda de posição ou se remexe quando precisa ficar parado?", example: "Pense em reuniões, refeições, aulas ou momentos de espera." },
  { id: "h2", domain: "hyperactivity", prompt: "Você se levanta ou se afasta quando seria esperado permanecer sentado?", example: "Ou sente uma necessidade muito forte de fazer isso." },
  { id: "h3", domain: "hyperactivity", prompt: "Você sente inquietação interna ou dificuldade para permanecer fisicamente tranquilo?", example: "Em adultos, isso pode aparecer mais como tensão ou necessidade de movimento." },
  { id: "h4", domain: "hyperactivity", prompt: "É difícil realizar atividades de descanso ou lazer de maneira tranquila?", example: "Considere também a sensação de precisar estar sempre fazendo algo." },
  { id: "h5", domain: "hyperactivity", prompt: "Você costuma agir como se estivesse sempre acelerado ou 'a mil'?", example: "A ponto de outras pessoas perceberem dificuldade em acompanhar seu ritmo." },
  { id: "h6", domain: "hyperactivity", prompt: "Você fala mais do que pretendia ou tem dificuldade para encerrar uma fala?", example: "Considere conversas, reuniões e situações sociais." },
  { id: "h7", domain: "hyperactivity", prompt: "Você responde antes de a pergunta terminar ou completa frases de outras pessoas?", example: "Pense em situações em que esperar a fala do outro parece muito difícil." },
  { id: "h8", domain: "hyperactivity", prompt: "Esperar sua vez costuma causar muita dificuldade ou impaciência?", example: "Como em filas, trânsito, jogos, conversas ou atendimentos." },
  { id: "h9", domain: "hyperactivity", prompt: "Você interrompe ou entra nas atividades de outras pessoas sem perceber?", example: "Considere conversas, decisões, tarefas e uso de objetos alheios." },
];

export const GAD7_ITEMS = [
  "Sentir-se nervoso, ansioso ou muito tenso",
  "Não conseguir parar ou controlar as preocupações",
  "Preocupar-se demais com diferentes assuntos",
  "Ter dificuldade para relaxar",
  "Ficar tão inquieto que é difícil permanecer parado",
  "Ficar facilmente irritado ou aborrecido",
  "Sentir medo como se algo ruim pudesse acontecer",
] as const;

export const IMPAIRMENT_AREAS = [
  { id: "work", label: "Trabalho ou estudos" },
  { id: "relationships", label: "Relacionamentos ou vida familiar" },
  { id: "social", label: "Contatos e situações sociais" },
  { id: "leisure", label: "Tempo livre, hobbies ou descanso" },
  { id: "self", label: "Autoconfiança ou autoimagem" },
] as const;

export function evaluateAdhd(
  answers: Record<string, AdhdAnswer>,
  impairmentCount: number,
  onsetBefore12: "no" | "unsure" | "yes",
  durationSixMonths: boolean,
) {
  const count = (domain: AdhdDomain, period: "adult" | "childhood") =>
    ADHD_ITEMS.filter((item) => item.domain === domain).filter((item) => {
      const answer = answers[item.id];
      return period === "adult" ? answer?.adult >= 2 : answer?.childhood === "yes";
    }).length;

  const adultAttention = count("attention", "adult");
  const adultHyperactivity = count("hyperactivity", "adult");
  const childhoodAttention = count("attention", "childhood");
  const childhoodHyperactivity = count("hyperactivity", "childhood");
  const adultThreshold = adultAttention >= 5 || adultHyperactivity >= 5;
  const childhoodPattern =
    onsetBefore12 === "yes" &&
    (childhoodAttention >= 3 || childhoodHyperactivity >= 3);
  const crossContextImpairment = impairmentCount >= 2;
  const axesMet = [adultThreshold, childhoodPattern, crossContextImpairment, durationSixMonths].filter(Boolean).length;

  return {
    adultAttention,
    adultHyperactivity,
    childhoodAttention,
    childhoodHyperactivity,
    adultThreshold,
    childhoodPattern,
    crossContextImpairment,
    durationSixMonths,
    level: axesMet >= 4 ? "high" : axesMet >= 2 ? "medium" : "low",
  } as const;
}

export function evaluateGad7(values: number[]) {
  const score = values.reduce((total, value) => total + value, 0);
  if (score >= 15) return { score, level: "high", label: "Sintomas de ansiedade em faixa grave" } as const;
  if (score >= 10) return { score, level: "medium", label: "Sintomas de ansiedade em faixa moderada" } as const;
  if (score >= 5) return { score, level: "mild", label: "Sintomas de ansiedade em faixa leve" } as const;
  return { score, level: "low", label: "Sintomas de ansiedade em faixa mínima" } as const;
}
