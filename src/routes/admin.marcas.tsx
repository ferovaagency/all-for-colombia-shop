import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  logo: string | null;
  show_in_home: boolean;
  display_order: number | null;
}

const BUCKET = 'product-images';

function AdminMarcas() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('brands')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false });
    setBrands((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (brand: Brand, file: File) => {
    setUploadingId(brand.id);
    try {
      const ext = file.name.split('.').pop();
      const path = `brands/${brand.slug}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { error } = await supabase.from('brands').update({ logo_url: pub.publicUrl } as any).eq('id', brand.id);
      if (error) throw error;
      toast.success(`Logo de ${brand.name} actualizado`);
      load();
    } catch (e: any) {
      toast.error('Error subiendo logo: ' + e.message);
    } finally {
      setUploadingId(null);
    }
  };

  const toggleHome = async (brand: Brand) => {
    const { error } = await supabase.from('brands').update({ show_in_home: !brand.show_in_home } as any).eq('id', brand.id);
    if (error) toast.error(error.message);
    else load();
  };

  const removeLogo = async (brand: Brand) => {
    if (!confirm(`¿Eliminar logo de ${brand.name}?`)) return;
    const { error } = await supabase.from('brands').update({ logo_url: null } as any).eq('id', brand.id);
    if (error) toast.error(error.message);
    else load();
  };

  const updateOrder = async (brand: Brand, newOrder: number) => {
    const { error } = await supabase.from('brands').update({ display_order: newOrder } as any).eq('id', brand.id);
    if (error) toast.error(error.message);
    else load();
  };

  if (loading) return <div className="container mx-auto py-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Gestor de marcas</h1>
      <p className="text-muted-foreground mb-6">Sube logos, controla qué marcas aparecen en el home y su orden</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((brand) => {
          const logo = brand.logo_url || brand.logo;
          return (
            <div key={brand.id} className="border rounded-lg p-4 bg-card">
              <div className="flex items-start gap-3">
                <div className="h-20 w-28 bg-white border rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logo ? (
                    <img src={logo} alt={brand.name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin logo</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{brand.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{brand.slug}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Switch checked={brand.show_in_home} onCheckedChange={() => toggleHome(brand)} />
                    <span className="text-xs">En home</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Orden</label>
                <Input
                  type="number"
                  defaultValue={brand.display_order ?? 100}
                  onBlur={(e) => updateOrder(brand, Number(e.target.value))}
                  className="h-8 w-20"
                />
                <label className="ml-auto">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(brand, f); }}
                  />
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border rounded cursor-pointer hover:bg-accent">
                    {uploadingId === brand.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {logo ? 'Cambiar' : 'Subir'}
                  </span>
                </label>
                {logo && (
                  <Button size="icon" variant="ghost" onClick={() => removeLogo(brand)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/admin/marcas')({ component: AdminMarcas });
