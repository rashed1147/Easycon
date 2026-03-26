import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

type Order = { id: string; order_number: string; total: number; status: string; created_at: string; address?: string; customers: { name: string; phone: string } | null }

const STATUSES = ['pending','confirmed','shipped','completed','cancelled']

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  async function load() {
    let q = supabase.from('orders').select('*,customers(name,phone)').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setOrders((data as Order[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function updateStatus(id: string, status: string) {
    await supabase.from('orders').update({ status }).eq('id', id)
    setOrders(o => o.map(x => x.id === id ? { ...x, status } : x))
  }

  return (
    <Layout title="Orders">
      <div className="flex gap-2 mb-5">
        {['all',...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              filter === s ? 'bg-blue-500 text-white' : 'bg-dark-800 text-white/50 border border-white/5 hover:text-white/80'
            }`}>{s}</button>
        ))}
      </div>
      <div className="bg-dark-800 border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-dark-900/50">
              {['Order','Customer','Phone','Amount','Status','Date'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-white/40 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">Loading...</td></tr>}
            {!loading && orders.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No orders found</td></tr>}
            {orders.map(o => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-xs text-white/70">{o.order_number}</td>
                <td className="px-4 py-3 text-white/80">{o.customers?.name || '—'}</td>
                <td className="px-4 py-3 text-white/50 text-xs">{o.customers?.phone || '—'}</td>
                <td className="px-4 py-3 text-green-400 font-medium">৳{o.total.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <select
                    value={o.status}
                    onChange={e => updateStatus(o.id, e.target.value)}
                    className="bg-dark-900 border border-white/10 rounded text-xs text-white/70 px-2 py-1 outline-none">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-white/40 text-xs">{format(new Date(o.created_at), 'MMM d, yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
