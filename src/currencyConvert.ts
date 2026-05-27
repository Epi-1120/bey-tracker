// Convert any supported currency to HKD using rates from frankfurter.
//
// Frankfurter returns rates with EUR as the base. To convert FROM currency
// X TO HKD, the formula is: amountInHKD = amountInX * (HKD_rate / X_rate).
// HKD/EUR is "how many HKD per 1 EUR", X/EUR is "how many X per 1 EUR",
// so HKD/X = (HKD/EUR) / (X/EUR).
//
// EUR itself is the base, which means it's not in the rates map - we treat
// it as 1.0 explicitly.

import { getRates, type SupportedCurrency } from './rates'

export interface Conversion {
  amount: number
  from: SupportedCurrency
  hkd: number
  ratesDate: string  // when frankfurter says these rates are from
}

function rateOf(rates: Record<string, number>, base: string, code: string): number {
  if (code === base) return 1
  const r = rates[code]
  if (r === undefined) {
    throw new Error(`frankfurter has no rate for ${code} (base ${base})`)
  }
  return r
}

export async function toHkd(amount: number, from: SupportedCurrency): Promise<Conversion> {
  if (from === 'HKD') {
    return { amount, from, hkd: amount, ratesDate: 'n/a' }
  }
  const cached = await getRates()
  const hkdPerBase = rateOf(cached.rates, cached.base, 'HKD')
  const fromPerBase = rateOf(cached.rates, cached.base, from)
  const hkd = amount * (hkdPerBase / fromPerBase)
  return {
    amount,
    from,
    hkd: Math.round(hkd * 100) / 100,
    ratesDate: new Date(cached.fetchedAt).toISOString().slice(0, 10),
  }
}