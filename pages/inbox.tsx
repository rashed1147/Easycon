import { useEffect, useState, useRef } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

type Message = { id: string; content: string; direction: string; is_ai: boolean; created_at: string }
type Sender = { fb_psid: string; sender_name: string; last_message: string; last_time: string; message_count: number; ai_enabled: boolean }

export default function Inbox() {
  const [senders, setSenders] = useState<Sender[]>([])
  const [selected, setSelected] = useState<Sender | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [aiEnabled, setAiEnabled] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadSenders() {
      const { data: logs } = await supabase
        .from('user_logs')
        .select('sender_id, sender_name, ai_enabled')
        .order('created_at', { ascending: false })

      if (!logs) return

      const sendersWithMessages = await Promise.all(
        logs.map(async (log) => {
          const { data: msgs, count } = await supabase
            .from('messages')
            .select('content, created_at', { count: 'exact' })
            .eq('fb_psid', log.sender_id)
            .order('created_at', { ascending: false })
            .limit(1)

          return {
            fb_psid: log.sender_id,
            sender_name: log.sender_name || `...${log.sender_id.slice(-4)}`,
            last_message: msgs?.[0]?.content || '',
            last_time: msgs?.[0]?.created_at || '',
            message_count: count || 0,
            ai_enabled: log.ai_enabled,
          }
        })
      )

      setSenders(sendersWithMessages)
    }
    loadSenders()
  }, [])

  useEffect(() => {
    if (!selected) return

    supabase
      .from('messages')
      .select('*')
      .eq('fb_psid', selected.fb_psid)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) || []))

    setAiEnabled(selected.ai_enabled)

    const channel = supabase
      .channel('inbox-' + selected.fb_psid)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `fb_psid=eq.${selected.fb_psid}` },
        payload => setMessages(prev => [...prev, payload.new as Message])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMsg() {
    if (!draft.trim() || !selected) return
    await supabase.from('messages').insert({
      fb_psid: selected.fb_psid,
      direction: 'out',
      content: draft.trim(),
      is_ai: false,
    })
    setDraft('')
  }

  async function toggleAI() {
    if (!selected) return
    const newVal = !aiEnabled
    setAiEnabled(newVal)
    await supabase
      .from('user_logs')
      .update({ ai_enabled: newVal })
      .eq('sender_id', selected.fb_psid)
    setSenders(prev =>
      prev.map(s => s.fb_psid === selected.fb_psid ? { ...s, ai_enabled: newVal } : s)
    )
  }

  const filtered = senders.filter(s =>
    (s.sender_name || '').toLowerCase().includes(search.toLowerCase()) ||
    s.fb_psid.includes(search)
  )

  function initials(name: string) {
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <Layout title="Inbox">
      <div
        className="flex gap-0 bg-dark-800 border border-white/5 rounded-xl overflow-hidden"
        style={{ height: 'calc(100vh - 120px)' }}
      >
        {/* Sender List */}
        <div className="w-64 border-r border-white/5 flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-white/5">
            <input
              className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 placeholder-white/30 outline-none"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-white/20 text-xs text-center py-8">No conversations yet</p>
            )}
            {filtered.map(s => (
              <button
                key={s.fb_psid}
                onClick={() => setSelected(s)}
                className={`w-full text-left px-3 py-3 border-b border-white/5 transition-colors flex items-center gap-2.5 ${
                  selected?.fb_psid === s.fb_psid ? 'bg-blue-500/10' : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center justify-center flex-shrink-0">
                  {initials(s.sender_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-white/80 text-xs font-medium truncate">{s.sender_name}</p>
                    {!s.ai_enabled && (
                      <span className="text-xs text-red-400/70 bg-red-400/10 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">Off</span>
                    )}
                  </div>
                  <p className="text-white/30 text-xs truncate mt-0.5">
                    {s.last_message?.slice(0, 25) || 'Image/Audio'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        {selected ? (
          <div className="flex-1 flex flex-col">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center justify-center">
                {initials(selected.sender_name)}
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">{selected.sender_name}</p>
                <p className="text-white/30 text-xs">{selected.message_count} messages</p>
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs text-white/50">
                <span>AI</span>
                <button
                  onClick={toggleAI}
                  className={`w-10 h-5 rounded-full relative transition-colors ${aiEnabled ? 'bg-blue-500' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${aiEnabled ? 'right-0.5' : 'left-0.5'}`} />
                </button>
                <span className={aiEnabled ? 'text-blue-400' : 'text-red-400'}>{aiEnabled ? 'ON' : 'OFF'}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-sm px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    m.direction === 'out'
                      ? m.is_ai
                        ? 'bg-blue-600/80 text-blue-100'
                        : 'bg-blue-500 text-white'
                      : 'bg-dark-700 border border-white/10 text-white/80'
                  }`}>
                    {m.is_ai && <p className="text-blue-300/60 text-xs mb-1">AI Reply</p>}
                    {m.content || <span className="text-white/30 italic text-xs">Image/Audio</span>}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t border-white/5 flex gap-2">
              <input
                className="flex-1 bg-dark-900 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/30"
                placeholder="Manual message পাঠাও..."
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMsg()}
              />
              <button
                onClick={sendMsg}
                className="w-9 h-9 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white text-sm transition-colors"
              >
                ➤
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </Layout>
  )
}
