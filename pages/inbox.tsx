import { useEffect, useState, useRef } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

type Message = { id: string; content: string; direction: string; is_ai: boolean; created_at: string }
type Sender = { fb_psid: string; last_message: string; last_time: string; message_count: number }

export default function Inbox() {
  const [senders, setSenders] = useState<Sender[]>([])
  const [selected, setSelected] = useState<Sender | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [aiEnabled, setAiEnabled] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load unique senders from messages
  useEffect(() => {
    async function loadSenders() {
      const { data } = await supabase
        .from('messages')
        .select('fb_psid, content, created_at, direction')
        .order('created_at', { ascending: false })

      if (!data) return

      // Group by fb_psid
      const map: Record<string, Sender> = {}
      data.forEach((m: { fb_psid: string; content: string; created_at: string; direction: string }) => {
        if (!map[m.fb_psid]) {
          map[m.fb_psid] = {
            fb_psid: m.fb_psid,
            last_message: m.content || '',
            last_time: m.created_at,
            message_count: 1,
          }
        } else {
          map[m.fb_psid].message_count++
        }
      })

      setSenders(Object.values(map))
    }
    loadSenders()
  }, [])

  // Load messages for selected sender
  useEffect(() => {
    if (!selected) return

    supabase
      .from('messages')
      .select('*')
      .eq('fb_psid', selected.fb_psid)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data as Message[]) || []))

    // Load AI status from user_logs
    supabase
      .from('user_logs')
      .select('ai_enabled')
      .eq('sender_id', selected.fb_psid)
      .single()
      .then(({ data }) => {
        if (data) setAiEnabled(data.ai_enabled)
      })

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
  }

  const filtered = senders.filter(s =>
    s.fb_psid.includes(search) ||
    (s.last_message || '').toLowerCase().includes(search.toLowerCase())
  )

  function shortId(psid: string) {
    return psid.slice(-4)
  }

  return (
    <Layout title="Inbox">
      <div
        className="flex gap-0 bg-dark-800 border border-white/5 rounded-xl overflow-hidden"
        style={{ height: 'calc(100vh - 120px)' }}
      >
        {/* Sender List */}
        <div className="w-56 border-r border-white/5 flex flex-col flex-shrink-0">
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
                className={`w-full text-left px-3 py-3 border-b border-white/5 transition-colors flex items-center gap-2 ${
                  selected?.fb_psid === s.fb_psid ? 'bg-blue-500/10' : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center justify-center flex-shrink-0">
                  {shortId(s.fb_psid)}
                </div>
                <div className="min-w-0">
                  <p className="text-white/80 text-xs font-medium truncate">...{shortId(s.fb_psid)}</p>
                  <p className="text-white/30 text-xs truncate">{s.last_message?.slice(0, 20) || 'Image/Audio'}</p>
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
                {shortId(selected.fb_psid)}
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">...{shortId(selected.fb_psid)}</p>
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
                <span className={aiEnabled ? 'text-blue-400' : 'text-white/30'}>{aiEnabled ? 'ON' : 'OFF'}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    m.direction === 'out'
                      ? m.is_ai
                        ? 'bg-blue-600/80 text-blue-100'
                        : 'bg-blue-500 text-white'
                      : 'bg-dark-700 border border-white/10 text-white/80'
                  }`}>
                    {m.is_ai && <p className="text-blue-300/60 text-xs mb-1">AI Reply</p>}
                    {m.content || <span className="text-white/30 italic">Image/Audio</span>}
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
