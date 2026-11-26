export const DEMO_DATE = "2026-11-26"
export const DEMO_START = "2026-10-11"
export const DEMO_END = "2027-01-19"

export const BARRIERS = {
  transport: "Transporte",
  childcare: "Responsabilidades familiares",
  health: "Saúde",
  skills: "Competências",
  workplace: "Condições de trabalho",
} as const

export const RENEWALS = {
  pending: "Por confirmar",
  renewed: "Renovado",
  declined: "Não renovado",
} as const

const DAY_MS = 86_400_000

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10)
}

function boundedDate(date: string, start: string, end: string): string {
  return date < start ? start : date > end ? end : date
}

export function contactDates(start: string, end: string) {
  const firstContact = addDays(start, 45)
  const contractReview = [addDays(start, 75), addDays(end, -30)].sort()[0]
  return {
    first: end < firstContact ? start : firstContact,
    second:
      contractReview < start ? start : boundedDate(contractReview, start, end),
    outcome: addDays(start, 180),
  }
}

const ACTIONS: Record<keyof typeof BARRIERS, string> = {
  transport: "Ajustar o horário para permitir o regresso a casa.",
  childcare:
    "Acordar um horário compatível com as responsabilidades familiares.",
  health:
    "Identificar adaptações que apoiem a saúde e a continuidade no trabalho.",
  skills:
    "Combinar formação prática para as tarefas que apresentam dificuldade.",
  workplace: "Acordar com a empresa uma melhoria nas condições de trabalho.",
}

export function suggestAction(
  barrier: keyof typeof BARRIERS,
  renewal: keyof typeof RENEWALS,
  end: string
) {
  const declined = renewal === "declined"
  const reviewTarget = addDays(DEMO_DATE, declined ? 7 : 14)
  const renewalReview = addDays(end, -30)
  const suggestedReview = [reviewTarget, renewalReview].sort()[0]

  return {
    title: declined
      ? "Preparar uma alternativa"
      : "Resolver a dificuldade identificada",
    reason: `${BARRIERS[barrier]} pode afetar a continuidade da colocação.`,
    action: declined
      ? "Contactar a pessoa e preparar outra possibilidade de colocação."
      : ACTIONS[barrier],
    owner: declined ? "Entidade de acompanhamento" : "Empresa",
    review: suggestedReview < DEMO_DATE ? DEMO_DATE : suggestedReview,
  }
}
