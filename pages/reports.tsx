import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

export default function Reports() {
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, totalMessages: 0, totalCustomers: 0, aiResolved: 0 })

  useEffect(() => {
    async function load() {
      const [o, r, m, c, ai] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact' }),
        supabase.from('orders').select('total'),
        supabase.from('messages').select('id', { count: 'exact' }),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('messages').select('id', { count: 'exact' }).eq('is_ai', true),
      ])
      const revenue = (r.data || []).reduce((s: number, x: { total: number }) => s + x.total, 0)
      setStats({
        totalOrders: o.count || 0,
        totalRevenue: revenue,
        totalMessages: m.count || 0,
        totalCustomers: c.count || 0,
        aiResolved: ai.count || 0,
      })
    }
    load()
  }, [])

  const aiRate = stats.totalMessages ? Math.round((stats.aiResolved / stats.totalMessages) * 100) : 0
  const avgOrder = stats.totalOrders ? Math.round(stats.totalRevenue / stats.totalOrders) : 0

  return (
    <Layout title="Reports">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          ['Total Revenue', `৳${stats.totalRevenue.toLocaleString()}`],
          ['Total Orders', stats.totalOrders],
          ['AI Resolution Rate', `${aiRate}%`],
          ['Avg Order Value', `৳${avgOrder.toLocaleString()}`],
        ].map(([l, v]) => (
          <div key={l as string} className="bg-dark-800 border border-white/5 rounded-xl p-4">
            <p className="text-xs text-white/40 mb-1">{l}</p>
            <p className="text-2xl font-medium text-white">{v}</p>
          </div>
        ))}
      </div>
      <div className="bg-dark-800 border border-white/5 rounded-xl p-5">
        <h2 className="text-sm font-medium text-white/60 mb-4">Overview</h2>
        <div className="space-y-3 text-sm">
          {[
            ['Total Customers', stats.totalCustomers],
            ['Total Messages', stats.totalMessages],
            ['AI Handled Messages', stats.aiResolved],
          ].map(([l, v]) => (
            <div key={l as string} className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-white/50">{l}</span>
              <span className="text-white/80 font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
