import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

type Order = {
  id: string
  order_number: string
  total: number
  status: string
  created_at: string
  customers: { name: string } | { name: string }[] | null
}

function getCustomerName(customers: Order['customers']): string {
  if (!customers) return '—'
  if (Array.isArray(customers)) return customers[0]?.name || '—'
  return customers.name || '—'
}

export default function Dashboard() {
  const [stats, setStats] = useState({ messages: 0, orders: 0, revenue: 0, customers: 0 })
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]

      const [msgRes, orderRes, revRes, custRes, recentRes] = await Promise.all([
        supabase.from('messages').select('id', { count: 'exact' }).gte('created_at', today),
        supabase.from('orders').select('id', { count: 'exact' }).gte('created_at', today),
        supabase.from('orders').select('total').gte('created_at', today),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('orders').select('id,order_number,total,status,created_at,customers(name)').order('created_at', { ascending: false }).limit(10),
      ])

      const revenue = (revRes.data || []).reduce((s: number, o: { total: number }) => s + (o.total || 0), 0)
      setStats({
        messages: msgRes.count || 0,
        orders: orderRes.count || 0,
        revenue,
        customers: custRes.count || 0,
      })
      setOrders((recentRes.data as unknown as Order[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: "Today's Messages", value: stats.messages, icon: '💬' },
    { label: "Today's Orders",   value: stats.orders,   icon: '🛒' },
    { label: "Today's Revenue",  value: `৳${stats.revenue.toLocaleString()}`, icon: '৳' },
    { label: 'Total Customers',  value: stats.customers, icon: '👤' },
  ]

  return (
    <Layout title="Dashboard">
      {loading ? (
        <div className="text-white/40 text-sm">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {statCards.map(c => (
              <div key={c.label} className="bg-dark-800 border border-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40">{c.label}</span>
                  <span className="text-lg opacity-40">{c.icon}</span>
                </div>
                <p className="text-2xl font-medium text-white">{c.value}</p>
              </div>
            ))}
          </div>

          <h2 className="text-sm font-medium text-white/60 mb-3">Recent Orders</h2>
          <div className="bg-dark-800 border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-dark-900/50">
                  {['Order','Customer','Amount','Status','Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs text-white/40 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30 text-sm">No orders yet</td></tr>
                )}
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-white/80 font-mono text-xs">{o.order_number}</td>
                    <td className="px-4 py-3 text-white/70">{getCustomerName(o.customers)}</td>
                    <td className="px-4 py-3 text-green-400 font-medium">৳{(o.total || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        o.status === 'completed' ? 'bg-green-400/10 text-green-400' :
                        o.status === 'cancelled' ? 'bg-red-400/10 text-red-400' :
                        'bg-yellow-400/10 text-yellow-400'
                      }`}>{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">{format(new Date(o.created_at), 'MMM d, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  )
}
