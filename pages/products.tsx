import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

type ProductImage = { id: number; image_url: string; is_primary: boolean }
type Product = {
  id: number
  product_id: string
  name: string
  description: string
  price: string
  availability: string
  product_images: ProductImage[]
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  async function load() {
    const { data } = await supabase
      .from('products')
      .select('id, product_id, name, description, price, availability, product_images(id, image_url, is_primary)')
      .order('id', { ascending: false })
    setProducts((data as Product[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleAvailability(id: number, current: string) {
    const newVal = current === 'yes' ? 'no' : 'yes'
    await supabase.from('products').update({ availability: newVal }).eq('id', id)
    setProducts(p => p.map(x => x.id === id ? { ...x, availability: newVal } : x))
  }

  async function deleteProduct(id: number) {
    if (!confirm('এই product টি delete করবেন?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(p => p.filter(x => x.id !== id))
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  function getPrimaryImage(images: ProductImage[]) {
    return images?.find(i => i.is_primary)?.image_url || images?.[0]?.image_url || null
  }

  return (
    <Layout title="Products">
      <div className="flex items-center justify-between mb-4">
        <input
          className="bg-dark-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/30 outline-none focus:border-blue-500/50 w-56"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <p className="text-xs text-white/30">Google Sheets থেকে product add হয় — n8n workflow ব্যবহার করুন</p>
      </div>

      <div className="bg-dark-800 border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-dark-900/50">
              {['Image', 'Name', 'Price', 'Availability', 'Images', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-white/40 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">Loading...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No products found</td></tr>
            )}
            {filtered.map(p => (
              <>
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    {getPrimaryImage(p.product_images) ? (
                      <img
                        src={getPrimaryImage(p.product_images)!}
                        alt={p.name}
                        className="w-12 h-12 object-cover rounded-lg border border-white/10"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-dark-700 rounded-lg border border-white/10 flex items-center justify-center text-white/20 text-xs">
                        No img
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white/80 font-medium">{p.name}</p>
                    <p className="text-xs text-white/30 mt-0.5 line-clamp-1">{p.description}</p>
                  </td>
                  <td className="px-4 py-3 text-green-400 font-medium">৳{p.price}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAvailability(p.id, p.availability)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${p.availability === 'yes' ? 'bg-blue-500' : 'bg-white/10'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${p.availability === 'yes' ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                    <span className={`ml-2 text-xs ${p.availability === 'yes' ? 'text-green-400' : 'text-white/30'}`}>
                      {p.availability === 'yes' ? 'In Stock' : 'Out'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors"
                    >
                      {p.product_images?.length || 0} images {expandedId === p.id ? '▲' : '▼'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                {expandedId === p.id && p.product_images?.length > 0 && (
                  <tr key={`images-${p.id}`} className="border-b border-white/5 bg-dark-900/30">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {p.product_images.map(img => (
                          <div key={img.id} className="relative">
                            <img
                              src={img.image_url}
                              alt=""
                              className="w-16 h-16 object-cover rounded-lg border border-white/10"
                            />
                            {img.is_primary && (
                              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded-full">P</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
