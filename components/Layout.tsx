import Sidebar from './Sidebar'

export default function Layout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-dark-900">
      <Sidebar />
      <main className="ml-52 flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 bg-dark-800 border-b border-white/5 px-6 py-3.5 flex items-center justify-between">
          <h1 className="text-lg font-medium text-white">{title}</h1>
          <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"/>AI Active
          </span>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  )
}
