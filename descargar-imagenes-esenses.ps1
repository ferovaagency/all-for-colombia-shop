# Descarga las imagenes del microsite de Esenses.
# Se ejecuta desde la carpeta del repo all-for-colombia-shop.
# Uso: clic derecho sobre este archivo > "Ejecutar con PowerShell"

$destino = Join-Path $PSScriptRoot "public\marcas\esenses"
New-Item -ItemType Directory -Force -Path $destino | Out-Null

$imagenes = @(
  @{ n = "hero-1.webp";           u = "https://esenses.com.co/wp-content/uploads/2026/08/B2.webp" }
  @{ n = "hero-2.jpg";            u = "https://esenses.com.co/wp-content/uploads/2025/12/Banner-esenses-01-02.jpg" }
  @{ n = "hero-3.webp";           u = "https://esenses.com.co/wp-content/uploads/2025/12/cateparlante-scaled.webp" }
  @{ n = "banner-parlantes.webp"; u = "https://esenses.com.co/wp-content/uploads/2025/12/bannerspeaker-scaled.webp" }
  @{ n = "mh10-a.webp";           u = "https://esenses.com.co/wp-content/uploads/2024/08/MH-10-1.webp" }
  @{ n = "mh10-b.webp";           u = "https://esenses.com.co/wp-content/uploads/2024/08/MH-10-4.webp" }
  @{ n = "sp3720-a.webp";         u = "https://esenses.com.co/wp-content/uploads/2025/03/7707409105512_001.webp" }
  @{ n = "sp3720-b.webp";         u = "https://esenses.com.co/wp-content/uploads/2025/03/7707409105512_002.webp" }
  @{ n = "tws.jpg";               u = "https://esenses.com.co/wp-content/uploads/2026/01/7707409105901_002.jpg" }
  @{ n = "reloj.webp";            u = "https://esenses.com.co/wp-content/uploads/2025/07/SW-IRON-NEGRO.webp" }
  @{ n = "cables.webp";           u = "https://esenses.com.co/wp-content/uploads/2024/07/CA-010.webp" }
  @{ n = "ambiente-1.webp";       u = "https://esenses.com.co/wp-content/uploads/2024/08/DSC0077.webp" }
  @{ n = "ambiente-2.webp";       u = "https://esenses.com.co/wp-content/uploads/2024/08/DSC0083.webp" }
  @{ n = "logo.webp";             u = "https://esenses.com.co/wp-content/uploads/2025/12/logonuevo.webp" }
)

$ok = 0; $fallaron = @()

foreach ($img in $imagenes) {
  $ruta = Join-Path $destino $img.n
  try {
    Invoke-WebRequest -Uri $img.u -OutFile $ruta -UseBasicParsing -TimeoutSec 45 -ErrorAction Stop
    $kb = [math]::Round((Get-Item $ruta).Length / 1KB)
    Write-Host ("  OK   {0}  ({1} KB)" -f $img.n, $kb) -ForegroundColor Green
    $ok++
  } catch {
    Write-Host ("  FALLO {0}" -f $img.n) -ForegroundColor Red
    Write-Host ("        {0}" -f $img.u) -ForegroundColor DarkGray
    $fallaron += $img.n
    if (Test-Path $ruta) { Remove-Item $ruta -Force }
  }
}

Write-Host ""
Write-Host ("Descargadas {0} de {1} en:" -f $ok, $imagenes.Count) -ForegroundColor Cyan
Write-Host ("  {0}" -f $destino)

if ($fallaron.Count -gt 0) {
  Write-Host ""
  Write-Host "No se pudieron bajar estas. Pasale la lista a Claude:" -ForegroundColor Yellow
  $fallaron | ForEach-Object { Write-Host ("  - {0}" -f $_) }
}

Write-Host ""
Read-Host "Listo. Enter para cerrar"
