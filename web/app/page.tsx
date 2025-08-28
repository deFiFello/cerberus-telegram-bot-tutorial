'use client'
import { useSearchParams } from 'next/navigation'

export default function Page() {
  const q = useSearchParams()
  const i = q.get('in') || '—'
  const o = q.get('out') || '—'
  const amt = q.get('amt') || '—'
  return (
    <main style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1>Cerberus Mini App</h1>
      <p>Swap request:</p>
      <pre style={{ background: '#f7f7f7', padding: 12 }}>{amt} {i} → {o}</pre>
      <p>Next: connect wallet and call API for quote.</p>
    </main>
  )
}
