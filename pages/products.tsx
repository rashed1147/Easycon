import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

type Product = { id: string; name: string; price: number; stock: number; is_active: boolean; image_url?: string; sizes?: string[] }

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', price: '', stock: '', sizes: '', description: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(id: string, val: boolean) {
    await supabase.from('products').update({ is_active: !val }).eq('id', id)
    setProducts(p => p.map(x => x.id === id ? { ...x, is_active: !val } : x))
  }

  async function deleteProduct(id: string) {
    if (!confirm('এই product টি delete করবেন?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(p => p.filter(x => x.id !== id))
  }

  async function saveProduct() {
    setSaving(true)
    const sizes = form.sizes.split(',').map(s => s.trim()).filter(Boolean)
    await supabase.from('products').insert({
      name: form.name,
      price: parseFloat(form.price),
      stock: parseInt(form.stock),
      sizes,
      description: form.description,
    })
    setForm({ name: '', price: '', stock: '', sizes: '', description: '' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <Layout title="Products">
      <div className="flex items-center justify-between mb-4">
        <input
          className="bg-dark-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 outline-none focus:border-blue-500/50 w-56"
          placeholder="Search products..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium">
          + Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-dark-800 border border-blue-500/20 rounded-xl p-5 mb-5">
          <h3 className="text-white font-medium mb-4 text-sm">New Product</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['name','Product Name (Bangla ok)','text'],
              ['price','Price (৳)','number'],
              ['stock','Stock quantity','number'],
              ['sizes','Sizes (S,M,L,XL)','text'],
            ].map(([f,p,t]) => (
              <input key={f}
                className="bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/50"
                type={t} placeholder={p}
                value={(form as Record<string,string>)[f]}
                onChange={e => setForm(prev => ({ ...prev, [f]: e.target.value }))}
              />
            ))}
            <input
              className="col-span-2 bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/50"
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={saveProduct} disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              {saving ? 'Saving...' : 'Save Product'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70 text-sm px-4 py-2">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-dark-800 border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-dark-900/50">
              {['Name','Price','Stock','Status','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-white/40 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30">Loading...</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30">No products found</td></tr>}
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white/80 font-medium">{p.name}</p>
                  {p.sizes?.length ? <p className="text-xs text-white/30 mt-0.5">{p.sizes.join(', ')}</p> : null}
                </td>
                <td className="px-4 py-3 text-green-400 font-medium">৳{p.price.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.stock < 5 ? 'bg-red-400/10 text-red-400' : 'bg-green-400/10 text-green-400'}`}>
                    {p.stock}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(p.id, p.is_active)}
                    className={`w-9 h-5 rounded-full relative transition-colors ${p.is_active ? 'bg-blue-500' : 'bg-white/10'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${p.is_active ? 'right-0.5' : 'left-0.5'}`}/>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteProduct(p.id)} className="text-red-400/60 hover:text-red-400 text-xs transition-colors">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
