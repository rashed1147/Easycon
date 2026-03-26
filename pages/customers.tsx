import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

type Customer = { id: string; name: string; phone?: string; address?: string; tags: string[]; total_spent: number; order_count: number; created_at: string }

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('customers').select('*').order('total_spent', { ascending: false })
      .then(({ data }) => { setCustomers((data as Customer[]) || []); setLoading(false) })
  }, [])

  const TAG_COLORS: Record<string,string> = {
    vip: 'bg-purple-400/15 text-purple-400',
    new: 'bg-blue-400/15 text-blue-400',
    repeat: 'bg-green-400/15 text-green-400',
    inactive: 'bg-white/10 text-white/40',
  }

  const filtered = customers.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  )

  const totalRevenue = customers.reduce((s, c) => s + c.total_spent, 0)
  const repeatBuyers = customers.filter(c => c.order_count > 1).length

  return (
    <Layout title="Customers">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          ['Total Customers', customers.length],
          ['Total Revenue', `৳${totalRevenue.toLocaleString()}`],
          ['Repeat Buyers', repeatBuyers],
          ['New (this month)', customers.filter(c => new Date(c.created_at) > new Date(Date.now() - 30*86400000)).length],
        ].map(([l,v]) => (
          <div key={l as string} className="bg-dark-800 border border-white/5 rounded-xl p-4">
            <p className="text-xs text-white/40 mb-1">{l}</p>
            <p className="text-2xl font-medium text-white">{v}</p>
          </div>
        ))}
      </div>

      <input
        className="bg-dark-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 outline-none focus:border-blue-500/50 w-64 mb-4"
        placeholder="Search by name or phone..."
        value={search} onChange={e => setSearch(e.target.value)}
      />

      <div className="bg-dark-800 border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-dark-900/50">
              {['Customer','Phone','Orders','Total Spent','Tags','Joined'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-white/40 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">Loading...</td></tr>}
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center justify-center flex-shrink-0">
                      {(c.name || '?').slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white/80 font-medium">{c.name || 'Unknown'}</p>
                      {c.address && <p className="text-xs text-white/30">{c.address}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/50 text-xs">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-white/70 font-medium">{c.order_count}</td>
                <td className="px-4 py-3 text-green-400 font-medium">৳{c.total_spent.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {c.tags.map(t => (
                      <span key={t} className={`px-2 py-0.5 rounded-full text-xs ${TAG_COLORS[t] || 'bg-white/10 text-white/50'}`}>{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-white/40 text-xs">{format(new Date(c.created_at), 'MMM d, yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
