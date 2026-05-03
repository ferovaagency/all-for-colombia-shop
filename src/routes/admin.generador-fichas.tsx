import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  Loader2, Upload, X, Sparkles, Eye, Pencil,
  Plus, Trash2, ToggleLeft, ToggleRight,
  Search, ImageIcon, ArrowLeft,
} from 'lucide-react';

export const Route = createFileRoute('/admin/generador-fichas')({
  component: ProductGeneratorPage,
});

const WARRANTY_OPTIONS = [
  '6 meses con fabricante',
  '12 meses con fabricante',
  '24 meses con fabricante',
  '6 meses con All For All',
  '12 meses con All For All',
  'Sin garantía',
];

const BLOG_TYPES: Record<string, string> = {
  '800': 'Post rápido (800 palabras)',
  '1200': 'Artículo informativo (1200 palabras)',
  '2000': 'Guía completa (2000+ palabras)',
};

function extractMeta(html: string, key: string) {
  const match = html.match(new RegExp(`<!--\\s*${key}:([\\s\\S]*?)-->`, 'i'));
  return match?.[1]?.trim() || '';
}

function extractH1(html: string) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match?.[1]?.replace(/<[^>]+>/g, '').trim() || '';
}

function slugify(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-').slice(0, 80);
}

function ImagePreview({ url, label }: { url: string; label: string }) {
  if (!url) return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <div className="flex flex-col items-center gap-2 text-center">
        <ImageIcon className="h-8 w-8" />
        <span className="px-4 text-xs font-medium">{label}</span>
      </div>
    </div>
  );
  return (
    <img src={url} alt={label}
      className="h-full w-full object-cover object-center"
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
  );
}

function ProductGeneratorPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState('productos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [sku, setSku] = useState('');
  const [condition, setCondition] = useState('Nuevo');
  const [warranty, setWarranty] = useState('12 meses con fabricante');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [specsText, setSpecsText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [stock, setStock] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [blogTopic, setBlogTopic] = useState('');
  const [blogKeywords, setBlogKeywords] = useState('');
  const [blogIndustry, setBlogIndustry] = useState('Tecnología');
  const [blogNotes, setBlogNotes] = useState('');
  const [blogType, setBlogType] = useState('1200');
  const [blogHtml, setBlogHtml] = useState('');
  const [blogMetaTitle, setBlogMetaTitle] = useState('');
  const [blogMetaDesc, setBlogMetaDesc] = useState('');
  const [blogSlug, setBlogSlug] = useState('');
  const [blogExcerpt, setBlogExcerpt] = useState('');
  const [blogCoverImage, setBlogCoverImage] = useState('');
  const [generatingBlog, setGeneratingBlog] = useState(false);
  const [savingBlog, setSavingBlog] = useState(false);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [editingBlog, setEditingBlog] = useState<any | null>(null);
  const [blogSearch, setBlogSearch] = useState('');
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState('');

  const slug = slugify(name);
  const parentCats = categories.filter(c => !c.parent_id);
  const getChildren = (id: string) => categories.filter(c => c.parent_id === id);

  const fetchData = useCallback(async () => {
    const [prodsRes, catsRes, brandsRes, postsRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('brands').select('*').order('name'),
      supabase.from('blog_posts').select('*').order('created_at', { ascending: false }),
    ]);
    if (prodsRes.data) setProducts(prodsRes.data);
    if (catsRes.data) setCategories(catsRes.data);
    if (brandsRes.data) setBrands(brandsRes.data);
    if (postsRes.data) setBlogPosts(postsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setEditingId(null); setName(''); setPrice(''); setSalePrice('');
    setSku(''); setCondition('Nuevo'); setWarranty('12 meses con fabricante');
    setShortDesc(''); setDescription(''); setSpecsText('');
    setSelectedCategory(''); setSelectedBrand('');
    setMetaTitle(''); setMetaDesc(''); setImageUrls([]);
    setStock(''); setAiNotes('');
  };

  const resetBlogForm = () => {
    setEditingBlog(null); setBlogTopic(''); setBlogKeywords('');
    setBlogIndustry('Tecnología'); setBlogNotes(''); setBlogType('1200');
    setBlogHtml(''); setBlogMetaTitle(''); setBlogMetaDesc('');
    setBlogSlug(''); setBlogExcerpt(''); setBlogCoverImage('');
  };

  const loadProduct = (p: any) => {
    setEditingId(p.id); setName(p.name); setPrice(String(p.price));
    setSalePrice(p.sale_price ? String(p.sale_price) : '');
    setSku(p.sku || ''); setCondition(p.condition || 'Nuevo');
    setWarranty(p.warranty || '12 meses con fabricante');
    setShortDesc(p.short_description || ''); setDescription(p.description || '');
    setSpecsText(p.specs ? Object.entries(p.specs as Record<string, string>)
      .map(([k, v]) => `${k}: ${v}`).join('\n') : '');
    setSelectedCategory(p.category || ''); setSelectedBrand(p.brand || '');
    setMetaTitle(p.meta_title || ''); setMetaDesc(p.meta_description || '');
    setImageUrls((p.images || []).filter((u: any) => typeof u === 'string' && u.trim()));
    setStock(p.stock != null ? String(p.stock) : '');
    setTab('productos'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadBlogPost = (post: any) => {
    setEditingBlog(post); setBlogHtml(post.content || '');
    setBlogMetaTitle(post.meta_title || ''); setBlogMetaDesc(post.meta_description || '');
    setBlogSlug(post.slug || ''); setBlogExcerpt(post.excerpt || '');
    setBlogCoverImage(post.cover_image || ''); setBlogTopic(post.title || '');
    setTab('blog'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const parseSpecs = (text: string): Record<string, string> => {
    const parsed: Record<string, string> = {};
    text.split('\n').forEach(line => {
      const idx = line.indexOf(':');
      if (idx > 0) parsed[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    });
    return parsed;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploadingImage(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('product-images')
          .upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        setImageUrls(prev => [...prev, data.publicUrl]);
      }
      toast.success('Imagen subida correctamente');
    } catch (err: any) {
      toast.error('Error al subir imagen: ' + err.message);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadAndUploadImage = async (imageUrl: string, productSlug: string): Promise<string | null> => {
    try {
      const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;
      const response = await fetch(proxiedUrl);
      if (!response.ok) return null;
      const blob = await response.blob();
      const ext = imageUrl.split('.').pop()?.split('?')[0]?.slice(0, 4) || 'jpg';
      const fileName = `products/${productSlug}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('product-images')
        .upload(fileName, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
      if (error) return null;
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch { return null; }
  };

  const addImageUrl = () => {
    const input = imageUrlInput.trim();
    if (!input) return;
    setImageUrls(prev => [...prev, input]);
    setImageUrlInput('');
  };

  const removeImage = (idx: number) => setImageUrls(prev => prev.filter((_, i) => i !== idx));

  const handleGenerateAI = async () => {
    if (!name) { toast.error('Ingresa el nombre del producto primero'); return; }
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-sheet', {
        body: {
          name, price, brand: selectedBrand, category: selectedCategory,
          condition, warranty, specs: aiNotes,
        }
      });
      if (error) throw error;
      if (data.description) setDescription(data.description);
      if (data.short_description) setShortDesc(data.short_description);
      if (data.meta_title) setMetaTitle(data.meta_title);
      if (data.meta_description) setMetaDesc(data.meta_description);
      if (data.specs && typeof data.specs === 'object') {
        setSpecsText(Object.entries(data.specs as Record<string, string>)
          .map(([k, v]) => `${k}: ${v}`).join('\n'));
      }
      if (data.category && !selectedCategory) setSelectedCategory(data.category);
      if (data.brand && !selectedBrand) setSelectedBrand(data.brand);
      toast.success('Contenido generado con IA');
    } catch (err: any) {
      toast.error('Error al generar: ' + err.message);
    } finally { setGeneratingAI(false); }
  };

  const handleSave = async () => {
    if (!name || !price) { toast.error('Nombre y precio son obligatorios'); return; }
    if (imageUrls.length === 0) { toast.error('Agrega al menos una imagen'); return; }
    setSaving(true);
    try {
      const finalImages: string[] = [];
      for (const url of imageUrls) {
        if (url.startsWith('http') && !url.includes('supabase')) {
          const uploaded = await downloadAndUploadImage(url, slug);
          finalImages.push(uploaded || url);
        } else { finalImages.push(url); }
      }
      let finalSlug = slug;
      if (!editingId) {
        let suffix = 1;
        while (true) {
          const checkSlug = suffix === 1 ? finalSlug : `${finalSlug}-${suffix}`;
          const { data } = await supabase.from('products').select('id').eq('slug', checkSlug).maybeSingle();
          if (!data) { finalSlug = checkSlug; break; }
          suffix++;
        }
      }
      const catData = selectedCategory
        ? (await supabase.from('categories').select('id').eq('name', selectedCategory).single()).data : null;
      const brandData = selectedBrand
        ? (await supabase.from('brands').select('id').eq('name', selectedBrand).single()).data : null;
      const productData = {
        name, slug: finalSlug, price: Number(price),
        sale_price: salePrice ? Number(salePrice) : null,
        sku: sku || null, condition, warranty,
        category: selectedCategory || null, brand: selectedBrand || null,
        category_id: catData?.id || null, brand_id: brandData?.id || null,
        stock: stock ? parseInt(stock) : 0,
        short_description: shortDesc || null, description: description || null,
        specs: Object.keys(parseSpecs(specsText)).length > 0 ? parseSpecs(specsText) : null,
        meta_title: metaTitle || null, meta_description: metaDesc || null,
        images: finalImages, active: true, updated_at: new Date().toISOString(),
      };
      const { error } = editingId
        ? await supabase.from('products').update(productData).eq('id', editingId)
        : await supabase.from('products').insert(productData);
      if (error) throw error;
      toast.success(editingId ? 'Producto actualizado' : 'Producto creado');
      resetForm(); fetchData();
    } catch (err: any) {
      toast.error('Error al guardar: ' + err.message);
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (p: any) => {
    await supabase.from('products').update({ active: !p.active, updated_at: new Date().toISOString() }).eq('id', p.id);
    fetchData();
  };

  const handleDelete = async (p: any) => {
    if (!confirm(`Eliminar "${p.name}"? Esta accion no se puede deshacer.`)) return;
    const { error } = await supabase.from('products').delete().eq('id', p.id);
    if (error) toast.error('Error: ' + error.message);
    else { toast.success('Producto eliminado'); fetchData(); }
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        toast.error('El CSV necesita encabezado y datos');
        return;
      }
      const sep = lines[0].includes(';') ? ';' : ',';
      const normalize = (s: string) => s
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['"]/g, '')
        .replace(/\s+/g, '_');
      const headers = lines[0].split(sep).map(normalize);
      const rows = lines.slice(1).map(line => {
        const vals = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
      }).filter(r => {
        const name = r.nombre || r.name || r.producto || '';
        return name.trim().length > 0;
      });
      setCsvPreview(rows);
      toast.success(`${rows.length} productos detectados`);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const uploadBulk = async () => {
    if (!csvPreview.length) return;
    setUploading(true); setUploadProgress(0);
    let ok = 0, fail = 0;
    for (let i = 0; i < csvPreview.length; i++) {
      const r = csvPreview[i];
      const name = (r.nombre || r.name || r.producto || r.titulo || '').trim();
      if (!name) { setUploadProgress(i + 1); continue; }
      setCurrentAction(`[${i + 1}/${csvPreview.length}] Procesando: ${name}`);
      const productSlug = slugify(name);
      let finalImageUrl = '';
      const imageUrl = (r.imagen_url || r.image_url || r.imagen || r.url_imagen || r.foto || r.image || '').trim();
      if (imageUrl) {
        setCurrentAction(`[${i + 1}/${csvPreview.length}] Descargando imagen: ${name}`);
        const uploaded = await downloadAndUploadImage(imageUrl, productSlug);
        finalImageUrl = uploaded || imageUrl;
      }
      setCurrentAction(`[${i + 1}/${csvPreview.length}] Guardando: ${name}`);
      const brandName = (r.marca || r.brand || r.fabricante || '').trim();
      const categoryName = (r.categoria || r.category || r.departamento || '').trim();
      const productSku = (r.sku || r.referencia || r.codigo || r.ref || '').trim();
      const productPrice = parseFloat((r.precio || r.price || r.valor || '0').replace(/[^0-9.]/g, '')) || null;
      const productSalePrice = parseFloat((r.precio_oferta || r.sale_price || r.oferta || r.precio_descuento || '0').replace(/[^0-9.]/g, '')) || null;
      const productStock = parseInt(r.stock || r.inventario || '0') || 0;
      const productDesc = (r.descripcion || r.description || r.detalle || '').trim() || null;
      const productShortDesc = (r.descripcion_corta || r.short_desc || r.resumen || r.short_description || '').trim() || null;
      const catData = categoryName ? (await supabase.from('categories').select('id').eq('name', categoryName).single()).data : null;
      const brandData = brandName ? (await supabase.from('brands').select('id').eq('name', brandName).single()).data : null;
      const { error } = await supabase.from('products').upsert({
        slug: productSlug, name,
        sku: productSku || null,
        price: productPrice,
        sale_price: productSalePrice,
        stock: productStock,
        description: productDesc,
        short_description: productShortDesc,
        category: categoryName || null, brand: brandName || null,
        category_id: catData?.id || null, brand_id: brandData?.id || null,
        images: finalImageUrl ? [finalImageUrl] : [],
        condition: 'Nuevo', warranty: '12 meses con fabricante',
        active: true, updated_at: new Date().toISOString(),
      }, { onConflict: 'slug' });
      if (error) fail++; else ok++;
      setUploadProgress(i + 1);
      if (i % 5 === 4) await new Promise(res => setTimeout(res, 200));
    }
    setUploading(false); setCurrentAction(''); setCsvPreview([]); setUploadProgress(0);
    if (fail > 0) toast.warning(`${ok} subidos, ${fail} con error`);
    else toast.success(`${ok} productos subidos`);
    fetchData();
  };

  const generateBlog = async () => {
    if (!blogTopic || !blogKeywords) { toast.error('Tema y palabras clave son obligatorios'); return; }
    setGeneratingBlog(true);
    try {
      const catalog = products.slice(0, 20)
        .map(p => `- ${p.name} | slug:${p.slug} | categoria:${p.category || 'General'}`).join('\n');
      const { data, error } = await supabase.functions.invoke('generate-blog-post', {
        body: {
          title: blogTopic, category: blogIndustry, keywords: blogKeywords,
          tone: 'profesional', wordCount: blogType,
          system: `Eres redactor SEO experto de All For All siguiendo Guia Editorial Ferova Agency.
REGLAS: H1 unico (max 65 chars con keyword) + frase inicial afirmativa (Sujeto+Verbo+Predicado) +
parrafo introductorio + desarrollo H2/H3 + cierre con CTA sutil.
NUNCA saltar niveles jerarquicos. Keyword en H1, primer parrafo y al menos 1 H2.
Densidad max 2-3%. Tono conversado pero profesional. Educacion antes que venta.
Mencionar "All For All" max 2 veces. NO clickbait ni venta agresiva.
META TAGS como comentarios al inicio del HTML:
<!-- META_TITLE: [max 60 chars] -->
<!-- META_DESCRIPTION: [150-160 chars] -->
<!-- SLUG: [slug-max-40-chars] -->
<!-- EXCERPT: [2 oraciones] -->
CATALOGO DISPONIBLE:
${catalog}`,
        }
      });
      if (error) throw error;
      const html = data?.content || '';
      setBlogHtml(html);
      setBlogMetaTitle(extractMeta(html, 'META_TITLE'));
      setBlogMetaDesc(extractMeta(html, 'META_DESCRIPTION'));
      setBlogSlug(extractMeta(html, 'SLUG'));
      setBlogExcerpt(extractMeta(html, 'EXCERPT'));
      toast.success('Articulo generado');
    } catch (err: any) {
      toast.error('Error al generar blog: ' + err.message);
    } finally { setGeneratingBlog(false); }
  };

  const saveBlog = async (publish: boolean) => {
    const title = extractH1(blogHtml) || blogTopic;
    if (!title || !blogSlug || !blogHtml) { toast.error('Faltan datos del articulo'); return; }
    setSavingBlog(true);
    try {
      const payload = {
        title, slug: slugify(blogSlug).slice(0, 40),
        content: blogHtml, excerpt: blogExcerpt || null,
        meta_title: blogMetaTitle || null, meta_description: blogMetaDesc || null,
        cover_image: blogCoverImage || null, published: publish,
        updated_at: new Date().toISOString(),
      };
      const result = editingBlog
        ? await supabase.from('blog_posts').update(payload).eq('id', editingBlog.id)
        : await supabase.from('blog_posts').insert({ ...payload, created_at: new Date().toISOString() });
      if (result.error) throw result.error;
      toast.success(publish ? 'Articulo publicado' : 'Guardado como borrador');
      fetchData();
      if (!editingBlog) resetBlogForm();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally { setSavingBlog(false); }
  };

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => p.name?.toLowerCase().includes(q));
  }, [products, productSearch]);

  const filteredBlogPosts = useMemo(() => {
    const q = blogSearch.trim().toLowerCase();
    if (!q) return blogPosts;
    return blogPosts.filter(p => `${p.title} ${p.slug}`.toLowerCase().includes(q));
  }, [blogPosts, blogSearch]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Admin
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-lg">Generador — <span className="text-secondary">All For All</span></h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="productos">Productos</TabsTrigger>
            <TabsTrigger value="blog">Blog</TabsTrigger>
            <TabsTrigger value="masivo">Carga Masiva CSV</TabsTrigger>
          </TabsList>

          {/* ═══ TAB PRODUCTOS ═══ */}
          <TabsContent value="productos">
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border p-5">
                <label className="block text-sm font-semibold mb-2">Editar producto existente o crear nuevo</label>
                <Select value={editingId || '__new__'} onValueChange={val => {
                  if (val === '__new__') { resetForm(); return; }
                  const p = products.find(p => p.id === val);
                  if (p) loadProduct(p);
                }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">+ Crear nuevo producto</SelectItem>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-white rounded-2xl border p-6 space-y-4">
                <h2 className="font-bold text-lg">Informacion del producto</h2>
                <div>
                  <Input placeholder="Nombre del producto *" value={name} onChange={e => setName(e.target.value)} className="h-11" />
                  {name && <p className="mt-1 text-xs text-muted-foreground">Slug: <code className="bg-muted px-1 rounded">{slug}</code></p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Precio COP *" type="number" value={price} onChange={e => setPrice(e.target.value)} />
                  <Input placeholder="Precio oferta COP" type="number" value={salePrice} onChange={e => setSalePrice(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="SKU / Referencia" value={sku} onChange={e => setSku(e.target.value)} />
                  <Input placeholder="Stock" type="number" value={stock} onChange={e => setStock(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={selectedCategory || '__auto__'} onValueChange={val => setSelectedCategory(val === '__auto__' ? '' : val)}>
                    <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto__">Asignacion automatica por IA</SelectItem>
                      {parentCats.flatMap(parent => [
                        <SelectItem key={parent.id} value={parent.name}>{parent.name}</SelectItem>,
                        ...getChildren(parent.id).map(sub =>
                          <SelectItem key={sub.id} value={sub.name}>&nbsp;&nbsp;{sub.name}</SelectItem>
                        ),
                      ])}
                    </SelectContent>
                  </Select>
                  <Select value={selectedBrand || '__auto__'} onValueChange={val => setSelectedBrand(val === '__auto__' ? '' : val)}>
                    <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__auto__">IA identifica la marca</SelectItem>
                      {brands.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Estado del producto</Label>
                  <RadioGroup value={condition} onValueChange={setCondition} className="flex gap-4">
                    {['Nuevo', 'Usado', 'Reacondicionado'].map(opt => (
                      <div key={opt} className="flex items-center gap-2">
                        <RadioGroupItem value={opt} id={`cond-${opt}`} />
                        <Label htmlFor={`cond-${opt}`} className="text-sm">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <Select value={warranty} onValueChange={setWarranty}>
                  <SelectTrigger><SelectValue placeholder="Garantia" /></SelectTrigger>
                  <SelectContent>
                    {WARRANTY_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-white rounded-2xl border p-6">
                <h2 className="font-bold text-lg mb-4">Imagenes (min 1 — max 5)</h2>
                <div className="flex flex-wrap gap-3 mb-4">
                  {imageUrls.map((url, i) => (
                    <div key={`${url}-${i}`} className="relative w-24 h-24 rounded-xl border overflow-hidden">
                      <ImagePreview url={url} label={`Imagen ${i + 1}`} />
                      <button onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                {imageUrls.length < 5 && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                      {uploadingImage ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Upload className="mr-2 w-4 h-4" />}
                      Subir archivo
                    </Button>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFileUpload} />
                    <div className="flex flex-1 gap-2">
                      <Input placeholder="URL de imagen (se descarga automaticamente)"
                        value={imageUrlInput} onChange={e => setImageUrlInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addImageUrl()} />
                      <Button type="button" variant="outline" onClick={addImageUrl}><Plus className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
                {imageUrlInput && (
                  <div className="mt-3 h-32 rounded-xl border overflow-hidden bg-gray-50">
                    <ImagePreview url={imageUrlInput} label="Vista previa" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">Las URLs externas se descargan y guardan con URL propia del almacenamiento</p>
              </div>

              <div className="bg-white rounded-2xl border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-lg">Contenido generado por IA</h2>
                    <p className="text-xs text-muted-foreground">Genera descripcion, SEO, specs, categoria y marca</p>
                  </div>
                  <Button onClick={handleGenerateAI} disabled={generatingAI || !name}>
                    {generatingAI ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Sparkles className="mr-2 w-4 h-4" />}
                    {generatingAI ? 'Generando...' : 'Generar con IA'}
                  </Button>
                </div>
                <Textarea placeholder="Pega specs del fabricante, caracteristicas especiales, casos de uso..."
                  value={aiNotes} onChange={e => setAiNotes(e.target.value)} rows={3} className="mb-4" />
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="secondary">Categoria: {selectedCategory || 'Automatica'}</Badge>
                  {selectedBrand && <Badge variant="secondary">Marca: {selectedBrand}</Badge>}
                </div>
                {shortDesc && <div className="mb-3"><p className="text-xs font-medium text-muted-foreground mb-1">Descripcion corta</p><p className="text-sm bg-muted rounded-lg p-3">{shortDesc}</p></div>}
                {metaTitle && <div className="mb-3"><p className="text-xs font-medium text-muted-foreground mb-1">Meta titulo</p><p className="text-sm bg-muted rounded-lg p-3">{metaTitle}</p></div>}
                {metaDesc && <div className="mb-3"><p className="text-xs font-medium text-muted-foreground mb-1">Meta descripcion</p><p className="text-sm bg-muted rounded-lg p-3">{metaDesc}</p></div>}
                {specsText && <div className="mb-3"><p className="text-xs font-medium text-muted-foreground mb-1">Especificaciones</p><pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap">{specsText}</pre></div>}
                {description && (
                  <details className="mb-3">
                    <summary className="text-xs font-medium text-muted-foreground cursor-pointer">Ver descripcion HTML generada</summary>
                    <div className="mt-2 border rounded-xl p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: description }} />
                  </details>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving} className="flex-1 h-12 text-base font-bold">
                  {saving && <Loader2 className="mr-2 w-5 h-5 animate-spin" />}
                  {editingId ? 'Actualizar producto' : 'Guardar producto'}
                </Button>
                {editingId && <Button variant="outline" onClick={resetForm}>Cancelar edicion</Button>}
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-xl">Productos en base de datos</h2>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Buscar por nombre..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-9" />
                  </div>
                </div>
                {filteredProducts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay productos aun.</p>
                ) : (
                  <div className="overflow-x-auto bg-white rounded-2xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Marca</TableHead>
                          <TableHead>Precio</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium text-sm">{p.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.category || '-'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.brand || '-'}</TableCell>
                            <TableCell className="text-sm">{p.price ? `$${parseInt(p.price).toLocaleString('es-CO')}` : '-'}</TableCell>
                            <TableCell className="text-sm">{p.stock ?? '-'}</TableCell>
                            <TableCell><Badge variant={p.active ? 'default' : 'secondary'}>{p.active ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => handleToggleActive(p)} title={p.active ? 'Desactivar' : 'Activar'}>
                                  {p.active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => loadProduct(p)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                                <a href={`/producto/${p.slug}`} target="_blank" rel="noopener noreferrer">
                                  <Button size="icon" variant="ghost" title="Ver"><Eye className="w-4 h-4" /></Button>
                                </a>
                                <Button size="icon" variant="ghost" onClick={() => handleDelete(p)} className="text-destructive hover:text-destructive" title="Eliminar">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ═══ TAB BLOG ═══ */}
          <TabsContent value="blog">
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <div className="bg-white rounded-2xl border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">Generador de articulos</h2>
                  <Button variant="ghost" size="sm" onClick={resetBlogForm}>Nuevo</Button>
                </div>
                <Input placeholder="Tema del articulo *" value={blogTopic} onChange={e => setBlogTopic(e.target.value)} />
                <Input placeholder="Palabras clave SEO (coma) *" value={blogKeywords} onChange={e => setBlogKeywords(e.target.value)} />
                <Select value={blogIndustry} onValueChange={setBlogIndustry}>
                  <SelectTrigger><SelectValue placeholder="Industria" /></SelectTrigger>
                  <SelectContent>
                    {['Tecnologia', 'E-commerce', 'Hogar', 'Gaming', 'Empresarial', 'General'].map(item =>
                      <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Notas adicionales (opcional)" value={blogNotes} onChange={e => setBlogNotes(e.target.value)} rows={2} />
                <Select value={blogType} onValueChange={setBlogType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(BLOG_TYPES).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={generateBlog} disabled={generatingBlog} className="w-full">
                  {generatingBlog ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <Sparkles className="mr-2 w-4 h-4" />}
                  {generatingBlog ? 'Generando...' : 'Generar con IA'}
                </Button>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Posts guardados</h3>
                    <div className="relative w-36">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input value={blogSearch} onChange={e => setBlogSearch(e.target.value)} placeholder="Buscar..." className="h-8 pl-7 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredBlogPosts.slice(0, 10).map(post => (
                      <button key={post.id} onClick={() => loadBlogPost(post)}
                        className="w-full text-left rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors">
                        <div className="font-medium truncate">{post.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {post.published ? 'Publicado' : 'Borrador'} - {post.slug}
                        </div>
                      </button>
                    ))}
                    {filteredBlogPosts.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No hay posts aun</p>}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Input placeholder="Meta title" value={blogMetaTitle} onChange={e => setBlogMetaTitle(e.target.value)} />
                  <Input placeholder="Meta description" value={blogMetaDesc} onChange={e => setBlogMetaDesc(e.target.value)} />
                  <Input placeholder="Slug" value={blogSlug} onChange={e => setBlogSlug(e.target.value)} />
                </div>
                <Textarea placeholder="Excerpt / resumen" value={blogExcerpt} onChange={e => setBlogExcerpt(e.target.value)} rows={2} />
                <div className="min-h-80 rounded-xl border bg-gray-50 p-4 overflow-y-auto">
                  {blogHtml
                    ? <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: blogHtml }} />
                    : <p className="text-sm text-muted-foreground">El articulo generado aparecera aqui.</p>}
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => saveBlog(false)} disabled={savingBlog || !blogHtml}>
                    {savingBlog && <Loader2 className="mr-2 w-4 h-4 animate-spin" />} Guardar borrador
                  </Button>
                  <Button onClick={() => saveBlog(true)} disabled={savingBlog || !blogHtml}>
                    {savingBlog && <Loader2 className="mr-2 w-4 h-4 animate-spin" />} Publicar en el blog
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ═══ TAB CARGA MASIVA ═══ */}
          <TabsContent value="masivo">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-bold mb-3">Formato del CSV</h3>
                <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs overflow-x-auto">
                  nombre,sku,descripcion,descripcion_corta,precio,precio_oferta,stock,marca,imagen_url,categoria
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>* nombre — obligatorio</span>
                  <span>o sku — referencia</span>
                  <span>o precio — sin puntos</span>
                  <span>o stock — cantidad</span>
                  <span>o marca — nombre exacto de la lista</span>
                  <span>o imagen_url — se descarga automaticamente</span>
                  <span>o categoria — nombre exacto</span>
                  <span>o descripcion — texto largo</span>
                </div>
              </div>

              <label className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-secondary hover:bg-secondary/5 transition-all block group bg-white">
                <input type="file" accept=".csv,.txt" onChange={handleCSV} className="hidden" />
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3 group-hover:text-secondary" />
                <p className="font-semibold">Arrastra tu CSV aqui</p>
                <p className="text-sm text-muted-foreground mt-1">o haz click para seleccionar</p>
              </label>

              {csvPreview.length > 0 && (
                <div className="bg-white rounded-2xl border overflow-hidden">
                  <div className="px-6 py-3 border-b bg-gray-50 flex items-center justify-between">
                    <span className="font-semibold text-sm">{csvPreview.length} productos listos</span>
                    <button onClick={() => setCsvPreview([])} className="text-xs text-muted-foreground hover:text-destructive">x Limpiar</button>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y">
                    {csvPreview.slice(0, 30).map((row, i) => (
                      <div key={i} className="flex items-center gap-3 px-6 py-2.5 text-sm">
                        <span className="text-muted-foreground text-xs w-6">{i + 1}</span>
                        <span className="font-medium flex-1 truncate">{row.nombre || row.name}</span>
                        <span className="text-muted-foreground text-xs font-mono">{row.sku || '-'}</span>
                        {row.marca && <Badge variant="secondary" className="text-[10px]">{row.marca}</Badge>}
                        {row.imagen_url && <span className="text-green-600 text-xs">img</span>}
                        <span className="text-secondary text-xs font-bold">
                          {row.precio ? `$${parseInt((row.precio || '0').replace(/[^0-9]/g, '')).toLocaleString('es-CO')}` : 'Sin precio'}
                        </span>
                      </div>
                    ))}
                    {csvPreview.length > 30 && <div className="px-6 py-2 text-xs text-muted-foreground text-center">... y {csvPreview.length - 30} mas</div>}
                  </div>
                  <div className="px-6 py-4 border-t bg-gray-50 space-y-3">
                    {uploading && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subiendo...</span>
                          <span className="font-bold text-secondary">{uploadProgress}/{csvPreview.length}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-secondary h-2 rounded-full transition-all"
                            style={{ width: `${Math.round((uploadProgress / csvPreview.length) * 100)}%` }} />
                        </div>
                        {currentAction && <p className="text-xs text-muted-foreground text-center animate-pulse">{currentAction}</p>}
                      </>
                    )}
                    <Button onClick={uploadBulk} disabled={uploading} className="w-full h-11 font-bold">
                      <Upload className="mr-2 w-4 h-4" />
                      {uploading ? `Subiendo ${uploadProgress}/${csvPreview.length}...` : `Subir ${csvPreview.length} productos`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
