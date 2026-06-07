<template>
  <main>
    <h1>bey-tracker</h1>
    <p class="sub">track Bey listings across HK and JP marketplaces, manually.</p>

    <form class="add" @submit.prevent="submit">
      <div class="row">
        <label>
          Bey
          <input v-model.trim="form.beyId" placeholder="dranbuster-3-60-r" required />
        </label>
        <label>
          Source
          <select v-model="form.source">
            <option value="carousell">Carousell</option>
            <option value="yahoo-auction-jp">Yahoo Auction JP</option>
            <option value="mandarake">Mandarake</option>
            <option value="mercari-jp">Mercari JP</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <div class="row">
        <label>
          Price
          <input v-model.number="form.amount" type="number" min="0" step="0.01" required />
        </label>
        <label>
          Currency
          <select v-model="form.currency">
            <option>HKD</option>
            <option>JPY</option>
            <option>CNY</option>
            <option>USD</option>
          </select>
        </label>
      </div>

      <label>
        URL
        <input v-model.trim="form.url" type="url" placeholder="https://..." />
      </label>

      <p v-if="error" class="err">{{ error }}</p>
      <button type="submit" :disabled="busy">Add listing</button>
    </form>

    <ul class="listings">
      <li v-for="l in listings" :key="l.id">
        <div>
          <strong>{{ l.beyId }}</strong>
          <span class="price">HKD {{ l.priceHkd.toFixed(2) }}</span>
          <span v-if="l.priceOriginal" class="orig">
            ({{ l.priceOriginal.amount }} {{ l.priceOriginal.currency }})
          </span>
        </div>
        <div class="meta">
          <span>{{ l.source }}</span>
          <a v-if="l.url" :href="l.url" target="_blank" rel="noreferrer">link</a>
          <button class="del" @click="drop(l.id)">remove</button>
        </div>
      </li>
      <li v-if="listings.length === 0" class="empty">Nothing tracked yet.</li>
    </ul>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { Listing, Source } from './listings'
import { addListing, loadListings, removeListing } from './store'
import { toHkd } from './currencyConvert'

const listings = ref<Listing[]>([])
const busy = ref(false)
const error = ref('')

const form = reactive({
  beyId: '',
  source: 'carousell' as Source,
  amount: 0,
  currency: 'HKD' as 'HKD' | 'JPY' | 'CNY' | 'USD',
  url: '',
})

onMounted(() => {
  listings.value = loadListings()
})

async function submit() {
  error.value = ''
  busy.value = true
  try {
    const conv = await toHkd(form.amount, form.currency)
    const entry: Omit<Listing, 'id'> = {
      beyId: form.beyId,
      source: form.source,
      url: form.url,
      priceHkd: conv.hkd,
      notedAt: new Date().toISOString(),
    }
    if (form.currency !== 'HKD') {
      entry.priceOriginal = { amount: form.amount, currency: form.currency }
    }
    listings.value = addListing(listings.value, entry)
    form.beyId = ''
    form.amount = 0
    form.url = ''
  } catch (e) {
    // most likely the rate fetch failed (offline, or frankfurter down)
    error.value = e instanceof Error ? e.message : 'could not add listing'
  } finally {
    busy.value = false
  }
}

function drop(id: string) {
  listings.value = removeListing(listings.value, id)
}
</script>

<style>
body {
  font-family: system-ui, sans-serif;
  margin: 2rem auto;
  max-width: 720px;
  padding: 0 1rem;
}
h1 {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}
.sub {
  color: #555;
}
.add {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 1.5rem 0;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}
.add .row {
  display: flex;
  gap: 0.75rem;
}
.add label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  font-size: 0.85rem;
  color: #444;
}
.add input,
.add select {
  padding: 0.4rem;
  font-size: 1rem;
}
.add button {
  align-self: flex-start;
  padding: 0.5rem 1rem;
}
.err {
  color: #c00;
  font-size: 0.85rem;
  margin: 0;
}
.listings {
  list-style: none;
  padding: 0;
}
.listings li {
  padding: 0.6rem 0;
  border-bottom: 1px solid #eee;
}
.price {
  margin-left: 0.5rem;
  font-variant-numeric: tabular-nums;
}
.orig {
  color: #888;
  font-size: 0.85rem;
}
.meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.8rem;
  color: #777;
  margin-top: 0.2rem;
}
.del {
  border: none;
  background: none;
  color: #c00;
  cursor: pointer;
  padding: 0;
}
.empty {
  color: #999;
}
</style>