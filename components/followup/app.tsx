"use client"

import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CalendarCheck,
  Check,
  Clock,
  ListChecks,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useState, useSyncExternalStore, type FormEvent } from "react"
import {
  addDays,
  BARRIERS,
  contactDates,
  DEMO_DATE,
  DEMO_END,
  DEMO_START,
  RENEWALS,
  suggestAction,
} from "@/lib/followup"
import { date } from "@/lib/fica/format"

type Status = "pending" | "resolved" | "open" | "unknown"
type Plan = {
  barrier: keyof typeof BARRIERS
  renewal: keyof typeof RENEWALS
  end: string
  worker: string
  company: string
  action: string
  owner: string
  review: string
  status: Status
  outcome: string
}

const INITIAL: Plan = {
  barrier: "transport",
  renewal: "pending",
  end: DEMO_END,
  worker: "O turno acaba depois do último autocarro.",
  company: "O horário parece estar a funcionar.",
  action: "",
  owner: "Empresa",
  review: "",
  status: "pending",
  outcome: "",
}
const KEY = "rj-connect-followup-v1"
const initialSnapshot = () => ""
let sessionSnapshot = ""

function subscribe(notify: () => void) {
  window.addEventListener("storage", notify)
  window.addEventListener(KEY, notify)
  return () => {
    window.removeEventListener("storage", notify)
    window.removeEventListener(KEY, notify)
  }
}

function snapshot() {
  try {
    return localStorage.getItem(KEY) ?? sessionSnapshot
  } catch {
    return sessionSnapshot
  }
}

function save(plan: Plan) {
  const json = JSON.stringify(plan)
  sessionSnapshot = json
  try {
    localStorage.setItem(KEY, json)
    window.dispatchEvent(new Event(KEY))
    return "Alterações guardadas neste navegador."
  } catch {
    window.dispatchEvent(new Event(KEY))
    return "Alterações disponíveis apenas nesta sessão."
  }
}

function readPlan(serialized: string): Plan {
  try {
    return serialized ? { ...INITIAL, ...JSON.parse(serialized) } : INITIAL
  } catch {
    return INITIAL
  }
}

const card =
  "rounded-[1.35rem] border border-[var(--fu-border)] bg-[var(--fu-card)] shadow-[0_8px_24px_#14254808]"
const muted = "text-[var(--fu-muted)]"
const button =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#075ad8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#074eb8]"
const input =
  "mt-2 min-h-11 w-full rounded-xl border border-[var(--fu-border)] bg-[var(--fu-bg)] px-3 py-2.5 text-sm font-normal"
const STATUS: Record<Status, string> = {
  pending: "Por rever",
  resolved: "Resolvido",
  open: "Ainda por resolver",
  unknown: "Por confirmar",
}

export function FollowupApp({ screen }: { screen: "week" | "plan" }) {
  const stored = useSyncExternalStore(subscribe, snapshot, initialSnapshot)
  const plan = readPlan(stored)
  const [notice, setNotice] = useState("")
  return (
    <div className="followup min-h-dvh">
      <header className="border-b border-[var(--fu-border)] bg-[var(--fu-card)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link
            href="/semana"
            className="inline-flex items-center gap-2 font-heading text-xl font-bold tracking-tight"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-[#075ad8] text-white">
              <Briefcase size={20} weight="fill" aria-hidden="true" />
            </span>
            RJ.connect
          </Link>
          <nav
            aria-label="Páginas"
            className="flex gap-1 text-sm font-semibold"
          >
            <Link
              href="/semana"
              aria-current={screen === "week" ? "page" : undefined}
              className="fu-tab"
            >
              Esta semana
            </Link>
            <Link
              href="/plano"
              aria-current={screen === "plan" ? "page" : undefined}
              className="fu-tab"
            >
              Plano
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pt-8 pb-12 sm:px-8 sm:pt-12">
        <p className={`mb-3 text-sm font-medium ${muted}`}>
          Demonstração · Lisboa · {date(DEMO_DATE)}
        </p>
        {screen === "week" ? (
          <Week plan={plan} />
        ) : (
          <PlanScreen key={stored} plan={plan} onSave={setNotice} />
        )}
        <p role="status" className={`mt-4 text-sm ${muted}`}>
          {notice}
        </p>
      </main>
    </div>
  )
}

function Week({ plan }: { plan: Plan }) {
  const { first, second } = contactDates(DEMO_START, plan.end)
  const weekEnd = addDays(DEMO_DATE, 4)
  const reviewDue =
    plan.action && plan.review <= weekEnd && plan.status !== "resolved"
  const tasks = [
    ...(!plan.action && first <= weekEnd
      ? [
          {
            date: first,
            title: "Fazer o primeiro contacto",
            detail: "Ouvir a pessoa e a empresa sobre as primeiras semanas.",
            icon: Clock,
          },
        ]
      : []),
    ...(plan.action && second <= weekEnd && second !== first
      ? [
          {
            date: second,
            title: "Rever a continuidade do contrato",
            detail: "Confirmar a renovação ou preparar outra colocação.",
            icon: Briefcase,
          },
        ]
      : []),
    ...(reviewDue
      ? [
          {
            date: plan.review,
            title:
              plan.renewal === "declined"
                ? "Rever a procura de outra colocação"
                : "Confirmar se a ação funcionou",
            detail: plan.action,
            icon: CalendarCheck,
          },
        ]
      : []),
  ].sort((a, b) => a.date.localeCompare(b.date))
  return (
    <>
      <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
        Esta semana
      </h1>
      <p className={`mt-2 ${muted}`}>
        Acompanha as primeiras semanas de uma colocação temporária.
      </p>
      <div className="mt-7 grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_17rem]">
        <section className={`${card} p-5 sm:p-6`} aria-labelledby="task-title">
          <h2
            id="task-title"
            className="flex items-center gap-2 text-lg font-bold"
          >
            <ListChecks size={22} aria-hidden="true" /> Contactos e revisões
          </h2>
          {tasks.length ? (
            <ul className="mt-4 divide-y divide-[var(--fu-border)]">
              {tasks.map(({ date: due, icon: Icon, title, detail }) => (
                <li key={title}>
                  <Link
                    href="/plano"
                    className="fu-task flex items-start gap-3 rounded-xl py-4"
                  >
                    <span className="fu-icon">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-xs font-semibold ${muted}`}>
                        {due === DEMO_DATE ? "Hoje" : date(due)} · Caso de
                        demonstração
                      </span>
                      <strong className="mt-0.5 block">{title}</strong>
                      <span
                        className={`mt-0.5 block text-sm break-words ${muted}`}
                      >
                        {detail}
                      </span>
                    </span>
                    <ArrowRight
                      size={18}
                      className="mt-2 shrink-0"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`mt-4 text-sm ${muted}`}>
              Sem contactos ou revisões pendentes para esta semana.
            </p>
          )}
          <Link href="/plano" className={`${button} mt-4`}>
            Abrir plano <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
        <aside className={`${card} p-5 sm:p-6`}>
          <ArrowDownRight
            size={24}
            className="text-[var(--fu-accent)]"
            aria-hidden="true"
          />
          <h2 className="mt-3 text-sm font-semibold">
            Permanência aos 180 dias
          </h2>
          <p className="mt-1 font-heading text-4xl font-bold tracking-tight tabular-nums">
            25,5%
          </p>
          <p className={`mt-2 text-sm ${muted}`}>
            111 de 436 colocações acompanhadas pela entidade de Lisboa, no
            estudo de 2024–2025.
          </p>
        </aside>
      </div>
    </>
  )
}

function PlanScreen({
  plan,
  onSave,
}: {
  plan: Plan
  onSave: (message: string) => void
}) {
  const [end, setEnd] = useState(plan.end)
  const [barrier, setBarrier] = useState(plan.barrier)
  const [renewal, setRenewal] = useState(plan.renewal)
  const [actionDraft, setActionDraft] = useState(plan.action)
  const [ownerDraft, setOwnerDraft] = useState(plan.owner)
  const [reviewDraft, setReviewDraft] = useState(plan.review)
  const [statusDraft, setStatusDraft] = useState(plan.status)
  const [feedback, setFeedback] = useState("")
  const suggestion = suggestAction(barrier, renewal, end || plan.end)
  const dates = contactDates(
    DEMO_START,
    end && end >= DEMO_START ? end : plan.end
  )
  const steps = [
    {
      title: "Ouvir os dois lados",
      detail: date(dates.first),
      done: !!plan.action,
    },
    {
      title: "Combinar uma ação",
      detail: plan.action ? plan.owner : "Definir uma medida e um prazo",
      done: !!plan.action,
    },
    {
      title: "Rever a ação e a renovação",
      detail: plan.review
        ? `${date(plan.review)} · ${STATUS[plan.status]}`
        : date(dates.second),
      done: plan.status === "resolved",
    },
    {
      title: "Registar aos 180 dias",
      detail: date(dates.outcome),
      done: !!plan.outcome,
    },
  ]
  const completed = steps.filter((step) => step.done).length

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const read = (key: string) => String(data.get(key) ?? "").trim()
    const action = read("action")
    const review = read("review")
    const status = read("status") as Status
    if ((action || review || status !== "pending") && (!action || !review)) {
      setFeedback("Indica uma ação e a data de revisão.")
      return
    }
    const message = save({
      end,
      barrier,
      renewal,
      worker: read("worker"),
      company: read("company"),
      action,
      owner: read("owner"),
      review,
      status,
      outcome: read("outcome"),
    })
    onSave(message)
  }

  return (
    <>
      <Link
        href="/semana"
        className={`inline-flex min-h-11 items-center gap-2 text-sm font-medium ${muted}`}
      >
        <ArrowLeft size={17} aria-hidden="true" /> Esta semana
      </Link>
      <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-5xl">
        Plano de acompanhamento
      </h1>
      <p className={`mt-2 text-sm ${muted}`}>
        Caso fictício · Contrato temporário iniciado a {date(DEMO_START)}
      </p>
      <div className="mt-6 grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]">
        <aside className={`${card} p-5 sm:p-6`} aria-label="Progresso do plano">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>Progresso</span>
            <span>
              {completed} de {steps.length}
            </span>
          </div>
          <progress
            className="fu-progress mt-3 w-full"
            value={completed}
            max={steps.length}
            aria-label="Passos concluídos"
          />
          <ol className="fu-timeline mt-5 space-y-4">
            {steps.map((step) => (
              <li key={step.title} className="relative flex gap-3">
                <span className={`fu-step ${step.done ? "fu-step-done" : ""}`}>
                  {step.done && (
                    <Check size={14} weight="bold" aria-label="Concluído" />
                  )}
                </span>
                <div>
                  <strong className="block text-sm">{step.title}</strong>
                  <span className={`text-xs ${muted}`}>{step.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </aside>
        <form onSubmit={handleSave} className={`${card} space-y-5 p-5 sm:p-6`}>
          <label className="block text-sm font-semibold">
            Fim previsto do contrato
            <input
              className={input}
              type="date"
              min={DEMO_START}
              required
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
          {dates.second !== addDays(DEMO_START, 75) && (
            <p className={`text-sm ${muted}`}>
              Revisão do contrato antecipada para {date(dates.second)}.
            </p>
          )}
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-lg font-bold">O que disseram?</legend>
            <label className="text-sm font-semibold">
              Pessoa
              <textarea
                name="worker"
                className={input}
                rows={3}
                maxLength={500}
                defaultValue={plan.worker}
              />
            </label>
            <label className="text-sm font-semibold">
              Empresa
              <textarea
                name="company"
                className={input}
                rows={3}
                maxLength={500}
                defaultValue={plan.company}
              />
            </label>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Dificuldade identificada
              <select
                className={input}
                value={barrier}
                onChange={(event) =>
                  setBarrier(event.target.value as Plan["barrier"])
                }
              >
                {Object.entries(BARRIERS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Renovação do contrato
              <select
                className={input}
                value={renewal}
                onChange={(event) =>
                  setRenewal(event.target.value as Plan["renewal"])
                }
              >
                {Object.entries(RENEWALS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <section
            aria-label="Próximo passo sugerido"
            className="rounded-xl border border-[var(--fu-border)] bg-[var(--fu-soft)] p-4"
          >
            <div aria-live="polite">
              <p className={`text-xs font-semibold ${muted}`}>
                Próximo passo sugerido
              </p>
              <h2 className="mt-1 text-lg font-bold">{suggestion.title}</h2>
              <p className="mt-1 text-sm">
                {suggestion.reason} {suggestion.action}
              </p>
              <p className={`mt-2 text-sm ${muted}`}>
                {suggestion.owner} · Rever até {date(suggestion.review)}
              </p>
            </div>
            <button
              type="button"
              className={`${button} mt-3`}
              onClick={() => {
                setActionDraft(suggestion.action)
                setOwnerDraft(suggestion.owner)
                setReviewDraft(suggestion.review)
                setStatusDraft("pending")
                setFeedback("")
              }}
            >
              Usar no plano <ArrowRight size={16} aria-hidden="true" />
            </button>
          </section>
          <fieldset>
            <legend className="mb-2 text-lg font-bold">Ação combinada</legend>
            <label className="block text-sm font-semibold">
              O que vai mudar?
              <textarea
                name="action"
                className={input}
                rows={2}
                maxLength={500}
                placeholder="Ex. experimentar um turno que termine antes do último autocarro"
                value={actionDraft}
                onChange={(event) => setActionDraft(event.target.value)}
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Responsável
                <select
                  name="owner"
                  className={input}
                  value={ownerDraft}
                  onChange={(event) => setOwnerDraft(event.target.value)}
                >
                  <option>Empresa</option>
                  <option>Entidade de acompanhamento</option>
                  <option>Pessoa</option>
                </select>
              </label>
              <label className="text-sm font-semibold">
                Data de revisão
                <input
                  name="review"
                  className={input}
                  type="date"
                  min={DEMO_START}
                  value={reviewDraft}
                  onChange={(event) => setReviewDraft(event.target.value)}
                />
              </label>
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Resultado da ação
              <select
                name="status"
                className={input}
                value={statusDraft}
                onChange={(event) =>
                  setStatusDraft(event.target.value as Status)
                }
              >
                {Object.entries(STATUS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Situação aos 180 dias
              <select
                name="outcome"
                className={input}
                defaultValue={plan.outcome}
              >
                <option value="">Por avaliar</option>
                <option>Na mesma colocação</option>
                <option>Novo emprego confirmado</option>
                <option>Sem colocação registada</option>
                <option>Situação por confirmar</option>
              </select>
            </label>
          </div>
          {feedback && (
            <p role="alert" className="text-sm text-red-600">
              {feedback}
            </p>
          )}
          <button type="submit" className={button}>
            <Check size={17} weight="bold" aria-hidden="true" /> Guardar plano
          </button>
        </form>
      </div>
    </>
  )
}
