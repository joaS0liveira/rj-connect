"use client"

import {
  RenewalRings,
  type RenewalContract,
  type RenewalRingsLabels,
} from "@/components/ui/renewal-rings"
import { CASES } from "@/lib/map/return"
import { CASE_OF, type Row } from "@/lib/map/groups"

const people = (n: number) => (n === 1 ? "1 pessoa" : `${n} pessoas`)
const days = (n: number) => (n === 1 ? "1 dia" : `${n} dias`)

const LABELS: Partial<RenewalRingsLabels> = {
  title: "Contratos a acabar",
  heading: "Tempo de contrato",
  subtitle: (months) => `Próximos ${months} meses · a partir de hoje`,
  pill: (count, d) => `${count} em ${d} dias`,
  shown: (shown, total) => `${shown} de ${total}`,
  today: "Hoje",
  daysLeft: (d) => (d === 1 ? "dia até ao fim" : "dias até ao fim"),
  inDays: (d) => `em ${d} dias`,
  term: "Contrato",
  notice: "Contacto",
  windowDays: (d) => days(d),
  dLeft: (d) => `faltam ${days(d)}`,
  ends: "Acaba a",
  acv: "Pessoas",
  autoRenew: "Renovação",
  yes: "Prevista",
  no: "Por confirmar",
  noticeDue: "Contactar até",
  noNotice: "Sem contacto",
  noticeAt: (date, d) =>
    d < 0
      ? `${date}, já passou`
      : d === 0
        ? `${date}, hoje`
        : `${date}, em ${days(d)}`,
  hint: "Passa por cima de um anel, ou usa o teclado, para ver o contrato.",
  empty: "Nenhum contrato acaba neste período.",
  noticeUnit: (d) => `em ${days(d)}`,
  autoRenewUnit: (total) => `de ${total}`,
  upForRenewal: "A acabar",
  chart: (heading) =>
    `${heading}. As setas mudam de contrato e Enter seleciona.`,
  contract: (c) =>
    `${c.name}: acaba a ${c.ends}, faltam ${days(c.days)}, contactar ${c.notice}.`,
  summary: (heading, total, months, inWindow, d) =>
    `${heading}: ${total} contratos acabam nos próximos ${months} meses, ${inWindow} nos próximos ${d} dias.`,
}

/**
 * The team's own list, one ring per contract still running: the day it ends
 * and, hatched, the 30 days before it when the contact should happen.
 */
export function ContractRings({ rows, today }: { rows: Row[]; today: string }) {
  const contracts: RenewalContract[] = rows
    .filter((r) => r.end && r.end >= today)
    .map((r, i) => ({
      id: `${r.code ?? "linha"}-${i}`,
      name: r.code ?? `Linha ${i + 1}`,
      endDate: r.end!,
      noticeDays: 30,
      value: r.n,
      note: CASES[CASE_OF[r.barrier] ?? "unknown"].label,
    }))
  if (contracts.length === 0)
    return (
      <p className="mt-6 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Sem dados disponíveis.</strong> Para
        ver os contratos a acabar, a lista precisa da coluna data_fim com datas
        de fim previstas.
      </p>
    )
  return (
    <div className="mt-6">
      <RenewalRings
        contracts={contracts}
        today={today}
        windowDays={60}
        locale="pt-PT"
        formatValue={people}
        labels={LABELS}
        className="max-w-none"
      />
      <p className="mt-2 text-xs text-muted-foreground">
        A parte tracejada de cada anel são os 30 dias antes do fim: é quando a
        equipa deve falar com a pessoa e com a empresa.
      </p>
    </div>
  )
}
