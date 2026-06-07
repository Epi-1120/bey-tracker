// localStorage-backed list of listings.
//
// No backend, no accounts. It's just me on one machine entering things
// I saw while browsing. If I ever want it on my phone too I'll deal with
// sync then - probably not worth it for a personal price log.

import type { Listing } from './listings'

const KEY = 'bey-tracker:listings'

export function loadListings(): Listing[] {
  const raw = localStorage.getItem(KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    // be a little defensive - I changed the shape once early on and
    // a stale entry without an id broke the list rendering
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x) => x && typeof x.id === 'string')
  } catch {
    return []
  }
}

function save(listings: Listing[]): void {
  localStorage.setItem(KEY, JSON.stringify(listings))
}

export function addListing(listings: Listing[], entry: Omit<Listing, 'id'>): Listing[] {
  const listing: Listing = { ...entry, id: crypto.randomUUID() }
  const next = [listing, ...listings]
  save(next)
  return next
}

export function removeListing(listings: Listing[], id: string): Listing[] {
  const next = listings.filter((l) => l.id !== id)
  save(next)
  return next
}

// cheapest entry per Bey, so I can eyeball whether a current listing is fair
export function cheapestByBey(listings: Listing[]): Map<string, Listing> {
  const out = new Map<string, Listing>()
  for (const l of listings) {
    const current = out.get(l.beyId)
    if (!current || l.priceHkd < current.priceHkd) {
      out.set(l.beyId, l)
    }
  }
  return out
}