// Tests for currencyConvert.ts.
//
// Most of these came out of one bad afternoon where the form was showing
// silly numbers because I had the EUR-base math the wrong way round.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toHkd } from './currencyConvert'

const CACHE_KEY = 'bey-tracker:rates'

function installLocalStorage(seed?: { fetchedAt: number; base: string; rates: Record<string, number> }) {
  const store: Record<string, string> = {}
  if (seed) store[CACHE_KEY] = JSON.stringify(seed)
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v)
    },
    removeItem: (k: string) => {
      delete store[k]
    },
  }
}

function failingFetch() {
  ;(globalThis as any).fetch = async () => {
    throw new Error('fetch should not be called in this test')
  }
}

test('toHkd: HKD passthrough does not hit network', async () => {
  installLocalStorage() // empty cache
  failingFetch()

  const r = await toHkd(123, 'HKD')

  assert.equal(r.hkd, 123)
  assert.equal(r.from, 'HKD')
  // ratesDate is "n/a" for the passthrough path, so consumers can tell
  // the result was not fx-converted
  assert.equal(r.ratesDate, 'n/a')
})

test('toHkd: JPY math is HKD/JPY ratio of EUR-base rates', async () => {
  installLocalStorage({
    fetchedAt: Date.now(),
    base: 'EUR',
    rates: { HKD: 9.1, JPY: 182 },
  })
  failingFetch()

  const r = await toHkd(3000, 'JPY')

  // 3000 JPY * (9.1 / 182) = 150 HKD exactly with these rounded rates.
  // I caught a bug here once where I wrote (JPY/HKD) instead of (HKD/JPY)
  // and got prices like 60000 HKD for a single Bey. test belongs here.
  assert.equal(r.hkd, 150)
  assert.equal(r.from, 'JPY')
})

test('toHkd: throws on a currency the rate sheet does not have', async () => {
  installLocalStorage({
    fetchedAt: Date.now(),
    base: 'EUR',
    // intentionally sparse - no GBP
    rates: { HKD: 9.1, JPY: 182 },
  })
  failingFetch()

  await assert.rejects(
    () => toHkd(50, 'GBP'),
    /no rate for GBP/,
  )
})