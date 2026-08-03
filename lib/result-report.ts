export const RESULT_TEST_NAMES = [
  "TDAH em adultos",
  "Ansiedade",
  "Sintomas depressivos",
  "Sinais de bipolaridade",
] as const;

export type ResultTestName = (typeof RESULT_TEST_NAMES)[number];

export type ResultReport = {
  test: ResultTestName;
  generatedAt: string;
  headline: string;
  summary: string;
  score?: string;
  details: string[];
  safetyNotice?: string;
};

export const RESULT_DISCLAIMER =
  "Este resumo é uma triagem informativa e não representa diagnóstico. A interpretação adequada exige avaliação profissional, história clínica e diagnósticos diferenciais.";

export function formatResultDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}
