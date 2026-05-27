// Currency rates for converting listing prices to HKD.
//
// I use frankfurter.dev because it has no API key and the data is sourced
// from the European Central Bank, which is a defensible choice for a hobby
// project. Rates are end-of-day, not realtime - that's fine for tracking
// listings, the prices in marketplaces don't move minute-to-minute either.
//
// We cache one fetch per UTC day in localStorage. ECB only updates once
// a day so refetching more often is wasted bandwidth.

const FRANKFURTER_LATEST = 'https://api.frankfurter.dev/v1/latest'
const CACHE_KEY = 'bey-tracker:rates'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

interface RatesResponse {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

interface CachedRates {
  fetchedAt: number
  base: string
  rates: Record<string, number>
}

export type SupportedCurrency = 'HKD' | 'JPY' | 'CNY' | 'USD' | 'EUR' | 'GBP'

function readCache(): CachedRates | null {
  const raw = localStorage.getItem(CACHE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CachedRates
  } catch {
    // bad json from a previous version, just toss it
    localStorage.removeItem(CACHE_KEY)
    return null
  }
}

function writeCache(data: CachedRates): void {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data))
}

async function fetchFreshRates(): Promise<CachedRates> {
  const res = await fetch(FRANKFURTER_LATEST)
  if (!res.ok) {
    throw new Error(`frankfurter: HTTP ${res.status}`)
  }
  const body = (await res.json()) as RatesResponse
  return {
    fetchedAt: Date.now(),
    base: body.base,
    rates: body.rates,
  }
}

export async function getRates(): Promise<CachedRates> {
  const cached = readCache()
  if (cached && Date.now() - cached.fetchedAt < ONE_DAY_MS) {
    return cached
  }
  const fresh = await fetchFreshRates()
  writeCache(fresh)
  return fresh
}