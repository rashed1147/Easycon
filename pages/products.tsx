import React, { useEffect, useState } from 'react'
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

  // Add Product Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [newProduct, setNewProduct] = useState({
    product_id: '',
    name: '',
    description: '',
    price: '',
    availability: 'yes' // Default to in stock
  })

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

  // Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files))
    }
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // 1. Insert the product
      const { data: insertedProduct, error: productError } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single()

      if (productError) throw productError

      let uploadedImagesData: ProductImage[] = []

      // 2. Upload images if any are selected
      if (imageFiles.length > 0) {
        const uploadPromises = imageFiles.map(async (file, index) => {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

          // Upload to Supabase Storage (Bucket name: 'product-images')
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, file)

          if (uploadError) throw uploadError

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName)

          return {
            product_id: insertedProduct.id, // Linking to the new product's database ID
            image_url: publicUrlData.publicUrl,
            is_primary: index === 0 // Make the first uploaded image the primary one
          }
        })

        const imageRecords = await Promise.all(uploadPromises)

        // 3. Insert image records into product_images table
        const { data: insertedImages, error: imagesError } = await supabase
          .from('product_images')
          .insert(imageRecords)
          .select()

        if (imagesError) throw imagesError
        if (insertedImages) uploadedImagesData = insertedImages as ProductImage[]
      }

      // 4. Update UI State
      setProducts([{ ...insertedProduct, product_images: uploadedImagesData }, ...products])
      
      // 5. Reset and close modal
      setNewProduct({ product_id: '', name: '', description: '', price: '', availability: 'yes' })
      setImageFiles([])
      setIsAddModalOpen(false)
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Failed to add product. Check the console for details.')
    } finally {
      setIsSubmitting(false)
    }
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
        <div className="flex items-center gap-4">
          <p className="text-xs text-white/30 hidden md:block">Google Sheets থেকে product add হয় — n8n workflow ব্যবহার করুন</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="text-lg leading-none mt-[-2px]">+</span> Add Product
          </button>
        </div>
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
              <React.Fragment key={p.id}>
                <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
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
                              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">Primary</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-800 border border-white/10 rounded-xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center shrink-0">
              <h3 className="text-white font-medium">Add New Product</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="text-white/40 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Product ID</label>
                <input 
                  required 
                  className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50" 
                  value={newProduct.product_id} 
                  onChange={e => setNewProduct({...newProduct, product_id: e.target.value})} 
                  placeholder="e.g. PRD-001" 
                />
              </div>
              
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Product Name</label>
                <input 
                  required 
                  className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50" 
                  value={newProduct.name} 
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                  placeholder="e.g. LED NoteBoard" 
                />
              </div>
              
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Price (৳)</label>
                <input 
                  required 
                  type="number" 
                  className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50" 
                  value={newProduct.price} 
                  onChange={e => setNewProduct({...newProduct, price: e.target.value})} 
                  placeholder="e.g. 600" 
                />
              </div>

              {/* NEW: Multiple Image Upload Field */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Product Images</label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 file:cursor-pointer cursor-pointer"
                />
                {imageFiles.length > 0 && (
                  <p className="text-xs text-green-400 mt-2">
                    {imageFiles.length} image(s) selected
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Description</label>
                <textarea 
                  className="w-full bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 resize-none" 
                  rows={3} 
                  value={newProduct.description} 
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})} 
                  placeholder="Product description..."
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center justify-center min-w-[120px]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Saving...
                    </span>
                  ) : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
