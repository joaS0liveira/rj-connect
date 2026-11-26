// What the map says about each of the eight regions, one per entity in the
// data. The figures are checked against public/data in places.test.ts.

export type EntityId =
  "E01" | "E02" | "E03" | "E04" | "E05" | "E06" | "E07" | "E08"

export type Place = {
  name: string
  /** Of 100 people who enter, how many get a job in the first year. */
  placed: number
  /** Of 100 jobs, how many last 180 days. */
  stay: number
  headline: string
  action: string
}

export const PLACES: Record<EntityId, Place> = {
  E01: {
    name: "Norte",
    placed: 54,
    stay: 80,
    headline: "Quem arranja emprego costuma ficar. O difícil é entrar.",
    action: "Falar com mais empresas da rede.",
  },
  E02: {
    name: "Centro",
    placed: 63,
    stay: 77,
    headline: "Nada fora do normal.",
    action: "Falar com a pessoa e a empresa antes de um temporário acabar.",
  },
  E03: {
    name: "Lisboa",
    placed: 84,
    stay: 25,
    headline: "Quase todos arranjam emprego, mas poucos ficam.",
    action: "Pedir contratos permanentes e falar com as pessoas ao dia 45.",
  },
  E04: {
    name: "Sul",
    placed: 48,
    stay: 69,
    headline: "É onde menos gente arranja emprego.",
    action: "Falar com mais empresas e perceber porque falham as ofertas.",
  },
  E05: {
    name: "Minho",
    placed: 60,
    stay: 76,
    headline: "Nada fora do normal.",
    action: "Falar com a pessoa e a empresa antes de um temporário acabar.",
  },
  E06: {
    name: "Alentejo",
    placed: 68,
    stay: 75,
    headline: "Arranja emprego a muita gente, mas metade é temporário.",
    action: "Perguntar sempre se há opção permanente.",
  },
  E07: {
    name: "Algarve",
    placed: 69,
    stay: 95,
    headline: "É onde mais gente fica.",
    action: "Perceber o que fazem de diferente e testar noutro lugar.",
  },
  E08: {
    name: "Ilhas",
    placed: 55,
    stay: 75,
    headline: "Quem arranja emprego costuma ficar. O difícil é entrar.",
    action: "Falar com mais empresas da rede.",
  },
}

/** All the regions together. */
export const ALL: Place = {
  name: "Todas as regiões",
  placed: 64,
  stay: 65,
  headline: "Em cada 3 empregos, cerca de 1 não chega aos 6 meses.",
  action: "Começar por Lisboa, de onde vem mais de metade das saídas.",
}

export const ENTITY_IDS = Object.keys(PLACES) as EntityId[]

/**
 * Regions that hold others. Each still has its own data, and choosing it
 * lights up every part: Norte takes in the Minho, and Sul is Lisboa, the
 * Alentejo and the Algarve together.
 */
export const PARTS: Partial<Record<EntityId, EntityId[]>> = {
  E01: ["E01", "E05"],
  E04: ["E04", "E03", "E06", "E07"],
}

/** The regions lit up when this one is chosen. */
export const partsOf = (id: EntityId | "all"): EntityId[] =>
  id === "all" ? [] : (PARTS[id] ?? [id])
