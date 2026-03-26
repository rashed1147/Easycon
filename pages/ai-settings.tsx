import { useState } from 'react'
import Layout from '../components/Layout'

type Setting = { id: string; label: string; desc: string; enabled: boolean }

export default function AISettings() {
  const [settings, setSettings] = useState<Setting[]>([
    { id: 'auto_reply', label: 'Auto Reply', desc: 'Customer message আসলে AI auto reply করবে', enabled: true },
    { id: 'order_detect', label: 'Order Detection', desc: 'Message থেকে order intent detect করবে', enabled: true },
    { id: 'product_suggest', label: 'Product Suggestions', desc: 'Customer query অনুযায়ী product suggest করবে', enabled: false },
    { id: 'bangla_reply', label: 'Reply in Bangla', desc: 'সব reply Bangla তে দেবে', enabled: true },
    { id: 'confirm_order', label: 'Confirm Before Order', desc: 'Order create করার আগে customer থেকে confirm নেবে', enabled: true },
    { id: 'ooo_reply', label: 'Out of Stock Reply', desc: 'Stock না থাকলে automatically জানাবে', enabled: true },
  ])

  const [systemPrompt, setSystemPrompt] = useState(`তুমি একটি Bangladeshi e-commerce store এর AI customer service agent।

তোমার কাজ:
- Bangla তে সব reply দেবে
- Product এর দাম, সাইজ, availability জানাবে
- Order নেবে (নাম, ঠিকানা, ফোন নম্বর সংগ্রহ করবে)
- Order confirm করে order number দেবে
- Friendly এবং professional থাকবে`)

  const toggle = (id: string) => setSettings(s => s.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x))

  return (
    <Layout title="AI Settings">
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-sm font-medium text-white/60 mb-3">Feature Toggles</h2>
          <div className="space-y-2">
            {settings.map(s => (
              <div key={s.id} className="bg-dark-800 border border-white/5 rounded-xl px-4 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">{s.label}</p>
                  <p className="text-white/40 text-xs mt-0.5">{s.desc}</p>
                </div>
                <button onClick={() => toggle(s.id)}
                  className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${s.enabled ? 'bg-blue-500' : 'bg-white/10'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${s.enabled ? 'right-0.5' : 'left-0.5'}`}/>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-white/60 mb-3">System Prompt</h2>
          <textarea
            className="w-full bg-dark-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 outline-none focus:border-blue-500/30 resize-none font-mono leading-relaxed"
            rows={10}
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
          />
          <button className="mt-2 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Save Prompt
          </button>
        </div>
      </div>
    </Layout>
  )
}
