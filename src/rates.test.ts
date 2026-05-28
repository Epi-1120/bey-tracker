// Tests for rates.ts.
//
// These cover the cases I actually hit while building this:
// - localStorage already had garbage in it from a prior schema, page broke
// - rate cache too eager: refetched on every form open during dev
// - HKD->HKD path was hitting fetch in an early version, breaks offline

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getRates } from './rates'

const CACHE_KEY = 'bey-tracker:rates'

// minimal localStorage shim. node:test runs in node so window.localStorage
// doesn't exist by default.
function installLocalStorage() {
  const store: Record<string, string> = {}
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

function stubFetchOnce(payload: unknown) {
  const calls: string[] = []
  ;(globalThis as any).fetch = async (url: string) => {
    calls.push(url)
    return {
      ok: true,
      status: 200,
      async json() {
        return payload
      },
    }
  }
  return calls
}

test('rates: bad JSON in cache is recovered, not thrown', async () => {
  installLocalStorage()
  localStorage.setItem(CACHE_KEY, 'this is not json')
  const calls = stubFetchOnce({
    base: 'EUR',
    date: '2026-05-28',
    rates: { HKD: 9.1, JPY: 185 },
  })

  const r = await getRates()

  assert.equal(r.base, 'EUR')
  assert.equal(calls.length, 1, 'should have fetched fresh after bad cache')
  // and the bad cache entry should be cleared (or overwritten with valid)
  const stored = localStorage.getItem(CACHE_KEY)
  assert.ok(stored && stored !== 'this is not json')
})

test('rates: second call within 24h does not refetch', async () => {
  installLocalStorage()
  const calls = stubFetchOnce({
    base: 'EUR',
    date: '2026-05-28',
    rates: { HKD: 9.1, JPY: 185 },
  })

  await getRates()
  await getRates()

  assert.equal(calls.length, 1, 'second call should hit cache, not network')
})