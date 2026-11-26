// "Voltar ao trabalho": the route back into a job, without another course.
// The ideas are the team's proposals; the companies and counts are data,
// checked in return.test.ts.

import type { EntityId } from "./places.ts"

export type CaseId =
  "ended" | "schedule" | "distance" | "papers" | "experience" | "unknown"

export const CASES: Record<
  CaseId,
  {
    label: string
    /** The barrier in the data that matches, when there is one. */
    barrier: string | null
    options: { title: string; step: string }[]
    avoid: string
  }
> = {
  ended: {
    label: "O contrato acabou",
    barrier: null,
    options: [
      {
        title: "Recolocar na mesma empresa",
        step: "Perguntar à empresa se tem nova vaga ou outra função onde a pessoa possa continuar.",
      },
      {
        title: "Encaminhar no mesmo setor",
        step: "Apresentar a pessoa a duas empresas parceiras do mesmo setor, com a experiência feita como referência.",
      },
      {
        title: "Pedir carta de referência",
        step: "Pedir à empresa uma carta de referência para usar nas próximas candidaturas.",
      },
    ],
    avoid:
      "Marcar com a empresa, 30 dias antes do fim, uma conversa sobre a renovação.",
  },
  schedule: {
    label: "O horário não dava",
    barrier: "horarios",
    options: [
      {
        title: "Ajustar o turno",
        step: "Negociar com a empresa um turno compatível com a família e os transportes da pessoa.",
      },
      {
        title: "Começar a tempo parcial",
        step: "Propor a mesma função a tempo parcial nas primeiras semanas, com aumento gradual.",
      },
      {
        title: "Vaga com horário fixo",
        step: "Encaminhar para uma vaga da mesma área com horário fixo e conhecido.",
      },
    ],
    avoid:
      "Confirmar com a pessoa o horário real, incluindo fins de semana, antes de assinar.",
  },
  distance: {
    label: "Ficava longe",
    barrier: "distancia",
    options: [
      {
        title: "Horário ajustado",
        step: "Acordar com a empresa um horário de entrada e saída compatível com os transportes públicos.",
      },
      {
        title: "Apoio ao transporte",
        step: "Pedir à empresa ou à entidade apoio para os custos de deslocação.",
      },
      {
        title: "Vaga mais próxima",
        step: "Procurar uma vaga equivalente a menos de 45 minutos de casa.",
      },
    ],
    avoid:
      "Fazer o percurso com a pessoa, à hora real do turno, antes do primeiro dia.",
  },
  papers: {
    label: "Faltava um documento",
    barrier: "documentacao",
    options: [
      {
        title: "Acompanhar ao serviço",
        step: "Marcar o atendimento no serviço certo e acompanhar a pessoa no próprio dia.",
      },
      {
        title: "Acordar um prazo",
        step: "Pedir à empresa que aceite o início com o documento em tratamento e um prazo de entrega.",
      },
      {
        title: "Lista de verificação",
        step: "Confirmar que documentos faltam, quem trata de cada um e até quando.",
      },
    ],
    avoid:
      "Verificar toda a documentação à entrada no programa, antes de qualquer entrevista.",
  },
  experience: {
    label: "Faltava experiência",
    barrier: "experiencia",
    options: [
      {
        title: "Dia de experiência",
        step: "Combinar meio dia na empresa para a pessoa conhecer a função antes de começar.",
      },
      {
        title: "Colega de referência",
        step: "Pedir à empresa um colega de referência para as primeiras quatro semanas.",
      },
      {
        title: "Função compatível",
        step: "Procurar uma função que use competências que a pessoa já tem.",
      },
    ],
    avoid:
      "Definir com a empresa, antes do início, quem ensina e o que se aprende na primeira semana.",
  },
  unknown: {
    label: "Ainda não se sabe",
    barrier: "nenhuma",
    options: [
      {
        title: "Conversa com a pessoa",
        step: "Uma conversa individual para perceber o que está a dificultar a continuidade.",
      },
      {
        title: "Conversa com a empresa",
        step: "Pedir à chefia direta uma avaliação das primeiras semanas.",
      },
      {
        title: "Rever o processo",
        step: "Rever o processo da pessoa e registar a barreira que ficou em falta.",
      },
    ],
    avoid:
      "Registar a principal barreira logo na primeira conversa de acompanhamento.",
  },
}

export const SECTORS = {
  agricultura: "Agricultura",
  comercio: "Comércio",
  hotelaria: "Hotelaria",
  industria: "Indústria",
  logistica: "Logística",
  saude: "Saúde",
  servicos: "Serviços",
  tecnologia: "Tecnologia",
} as const
export type Sector = keyof typeof SECTORS

export type Zone = "Norte" | "Centro" | "Lisboa" | "Sul" | "Ilhas"

/** The partner companies. The names are fictitious in the data. */
export const COMPANIES: {
  id: string
  name: string
  zone: Zone
  sector: Sector
}[] = [
  { id: "P01", name: "Empresa Parceira 01", zone: "Norte", sector: "servicos" },
  {
    id: "P02",
    name: "Empresa Parceira 02",
    zone: "Lisboa",
    sector: "comercio",
  },
  {
    id: "P03",
    name: "Empresa Parceira 03",
    zone: "Centro",
    sector: "industria",
  },
  { id: "P04", name: "Empresa Parceira 04", zone: "Ilhas", sector: "saude" },
  { id: "P05", name: "Empresa Parceira 05", zone: "Sul", sector: "hotelaria" },
  {
    id: "P06",
    name: "Empresa Parceira 06",
    zone: "Norte",
    sector: "logistica",
  },
  {
    id: "P07",
    name: "Empresa Parceira 07",
    zone: "Ilhas",
    sector: "tecnologia",
  },
  {
    id: "P08",
    name: "Empresa Parceira 08",
    zone: "Ilhas",
    sector: "agricultura",
  },
  { id: "P09", name: "Empresa Parceira 09", zone: "Ilhas", sector: "servicos" },
  { id: "P10", name: "Empresa Parceira 10", zone: "Sul", sector: "comercio" },
  {
    id: "P11",
    name: "Empresa Parceira 11",
    zone: "Norte",
    sector: "industria",
  },
  { id: "P12", name: "Empresa Parceira 12", zone: "Sul", sector: "saude" },
  {
    id: "P13",
    name: "Empresa Parceira 13",
    zone: "Centro",
    sector: "hotelaria",
  },
  {
    id: "P14",
    name: "Empresa Parceira 14",
    zone: "Norte",
    sector: "logistica",
  },
  {
    id: "P15",
    name: "Empresa Parceira 15",
    zone: "Norte",
    sector: "tecnologia",
  },
  {
    id: "P16",
    name: "Empresa Parceira 16",
    zone: "Ilhas",
    sector: "agricultura",
  },
]

/** The zone of each entity, as the data gives it. */
export const ZONE_OF: Record<EntityId, Zone> = {
  E01: "Norte",
  E02: "Centro",
  E03: "Lisboa",
  E04: "Sul",
  E05: "Norte",
  E06: "Centro",
  E07: "Sul",
  E08: "Ilhas",
}

/** Where on the map a company's zone is drawn, seen from a region. */
export function zoneOnMap(zone: Zone, from: EntityId): EntityId {
  if (ZONE_OF[from] === zone) return from
  const at: Record<Zone, EntityId> = {
    Norte: "E01",
    Centro: "E02",
    Lisboa: "E03",
    Sul: "E04",
    Ilhas: "E08",
  }
  return at[zone]
}

/** The companies of a sector, the ones in the region's own zone first. */
export function companiesFor(sector: Sector, from: EntityId) {
  return COMPANIES.filter((c) => c.sector === sector).sort(
    (a, b) =>
      Number(b.zone === ZONE_OF[from]) - Number(a.zone === ZONE_OF[from])
  )
}

export function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** The three follow-up contacts, counted from the first day of work. */
export const CHECKS = [
  {
    day: 45,
    title: "Primeiro contacto",
    detail: "Ouvir a pessoa e a empresa.",
  },
  {
    day: 75,
    title: "Segundo contacto",
    detail: "Confirmar que a solução resultou.",
  },
  {
    day: 180,
    title: "Seis meses",
    detail: "Registar se a pessoa continua no emprego.",
  },
] as const

const escape = (text: string) => text.replace(/([\\,;])/g, "\\$1")

/** Long lines are folded so every calendar app reads them. */
const fold = (line: string) => line.match(/.{1,60}/gu)?.join("\r\n ") ?? line

/**
 * A calendar file with one all-day event per check. It holds no personal
 * data: only the company, the plan and the dates.
 */
export function calendar({
  start,
  company,
  step,
  id,
}: {
  start: string
  company: string
  step: string
  id: string
}) {
  const compact = (iso: string) => iso.replaceAll("-", "")
  const events = CHECKS.flatMap((check) => {
    const day = addDays(start, check.day)
    return [
      "BEGIN:VEVENT",
      `UID:${id}-${check.day}@rj.connect`,
      `DTSTAMP:${compact(start)}T000000Z`,
      `DTSTART;VALUE=DATE:${compact(day)}`,
      `DTEND;VALUE=DATE:${compact(addDays(day, 1))}`,
      `SUMMARY:${escape(`RJ.connect · ${check.title} (dia ${check.day})`)}`,
      `DESCRIPTION:${escape(`${check.detail} Empresa: ${company}. Plano: ${step}`)}`,
      "END:VEVENT",
    ]
  })
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RJ.connect//Voltar ao trabalho//PT",
    ...events,
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n")
}
