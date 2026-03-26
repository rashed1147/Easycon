import { useEffect, useState, useRef } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

type Message = { id: string; content: string; direction: string; is_ai: boolean; created_at: string }
type Customer = { id: string; name: string; fb_psid: string; order_count: number; total_spent: number }

export default function Inbox() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selected, setSelected] = useState<Customer | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('customers').select('id,name,fb_psid,order_count,total_spent')
      .order('created_at', { ascending: false })
      .then(({ data }) => setCustomers((data as Customer[]) || []))
  }, [])

  useEffect(() => {
    if (!selected) return
    supabase.from('messages').select('*').eq('customer_id', selected.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) || []))

    const channel = supabase.channel('inbox-' + selected.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `customer_id=eq.${selected.id}` },
        payload => setMessages(prev => [...prev, payload.new as Message]))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMsg() {
    if (!draft.trim() || !selected) return
    await supabase.from('messages').insert({
      customer_id: selected.id, fb_psid: selected.fb_psid,
      direction: 'out', content: draft.trim(), is_ai: false,
    })
    setDraft('')
  }

  const filtered = customers.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <Layout title="Inbox">
      <div className="flex gap-0 bg-dark-800 border border-white/5 rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
        {/* List */}
        <div className="w-56 border-r border-white/5 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-white/5">
            <input
              className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 placeholder-white/30 outline-none"
              placeholder="Search..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(c => (
              <button key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-3 py-3 border-b border-white/5 transition-colors flex items-center gap-2 ${selected?.id === c.id ? 'bg-blue-500/10' : 'hover:bg-white/[0.03]'}`}>
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center justify-center flex-shrink-0">
                  {(c.name||'?').slice(0,2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white/80 text-xs font-medium truncate">{c.name || 'Unknown'}</p>
                  <p className="text-white/30 text-xs">{c.order_count} orders</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        {selected ? (
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center justify-center">
                {(selected.name||'?').slice(0,2).toUpperCase()}
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">{selected.name}</p>
                <p className="text-white/30 text-xs">{selected.order_count} orders • ৳{selected.total_spent.toLocaleString()} spent</p>
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs text-white/50">
                <span>AI</span>
                <div className="w-8 h-4 bg-blue-500 rounded-full relative">
                  <span className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"/>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    m.direction === 'out'
                      ? m.is_ai ? 'bg-blue-600/80 text-blue-100' : 'bg-blue-500 text-white'
                      : 'bg-dark-700 border border-white/10 text-white/80'
                  }`}>
                    {m.is_ai && <p className="text-blue-300/60 text-xs mb-1">AI Reply</p>}
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>
            <div className="p-3 border-t border-white/5 flex gap-2">
              <input
                className="flex-1 bg-dark-900 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/30"
                placeholder="Type a message..."
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMsg()}
              />
              <button onClick={sendMsg} className="w-9 h-9 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white text-sm transition-colors">
                ➤
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
            Select a customer to view conversation
          </div>
        )}
      </div>
    </Layout>
  )
}
