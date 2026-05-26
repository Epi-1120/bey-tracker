// A listing is one observation of a Bey for sale at a specific moment.
// We don't dedupe across sources, because the same Bey on Carousell HK
// and Yahoo Auction Japan are genuinely different things to me - shipping
// alone changes the real cost a lot.

export type Source =
  | 'carousell'
  | 'yahoo-auction-jp'
  | 'mandarake'
  | 'mercari-jp'
  | 'other'

export interface Listing {
  id: string
  beyId: string
  source: Source
  url: string
  priceHkd: number
  priceOriginal?: { amount: number; currency: string }
  notedAt: string
  note?: string
}