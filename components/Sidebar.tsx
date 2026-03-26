import Link from 'next/link'
import { useRouter } from 'next/router'

const nav = [
  { href: '/',          icon: '▣', label: 'Dashboard' },
  { href: '/inbox',     icon: '✉', label: 'Inbox' },
  { href: '/products',  icon: '◈', label: 'Products' },
  { href: '/orders',    icon: '◫', label: 'Orders' },
  { href: '/customers', icon: '◉', label: 'Customers' },
  { href: '/ai-settings',icon: '◎', label: 'AI Settings' },
  { href: '/reports',   icon: '▤', label: 'Reports' },
]

export default function Sidebar() {
  const { pathname } = useRouter()
  return (
    <aside className="w-52 bg-dark-900 flex flex-col h-screen fixed left-0 top-0 z-50 border-r border-white/5">
      <div className="px-4 py-4 flex items-center gap-2 border-b border-white/5">
        <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center text-xs font-bold text-white">SC</div>
        <span className="text-white font-medium text-sm">SmartChat</span>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {nav.map(n => (
          <Link key={n.href} href={n.href}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all border-l-2 ${
              pathname === n.href
                ? 'bg-blue-500/15 text-blue-400 border-blue-500'
                : 'text-white/50 border-transparent hover:bg-white/5 hover:text-white/80'
            }`}>
            <span className="w-4 text-center text-sm">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-white/5 text-xs text-white/30">
        <p className="mb-2">Rashed</p>
        <button className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors">
          ☾ Dark Mode
        </button>
      </div>
    </aside>
  )
}
