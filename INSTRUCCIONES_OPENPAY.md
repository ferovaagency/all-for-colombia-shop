# Instrucciones para Configurar Openpay

## ✅ PROBLEMA RESUELTO

El problema del error "[1002] The api key or merchant id are invalid" ha sido **RESUELTO**.

### Causa del Problema
El servidor no estaba leyendo las variables de entorno del archivo `.env`. Vite (el bundler que usa este proyecto) solo carga automáticamente las variables con prefijo `VITE_` para el cliente, pero no las variables del servidor.

### Solución Aplicada
1. **Credenciales configuradas:** Las credenciales de Openpay Sandbox están correctamente configuradas en el archivo `.env`
2. **Script de carga de variables:** Creé el archivo `server-env.ts` que carga las variables de entorno del archivo `.env` al inicio del servidor
3. **Integración:** Importé este script en los archivos de Openpay para asegurar que las variables estén disponibles antes de usarlas

### Verificación
Probé las credenciales directamente con un script y funcionaron correctamente (status 200, lista de bancos recibida).

## Pasos para Verificar que Funciona

1. **Reinicia el servidor de desarrollo:**
   ```bash
   # Detén el servidor actual (Ctrl+C)
   # Luego reinícialo
   npm run dev
   # o
   bun run dev
   ```

2. **Verifica el diagnóstico:**
   Visita: `http://localhost:8080/api/openpay/diagnostico`
   - Debería mostrar `"ready": true`
   - Debería mostrar `"api_working": true`
   - Debería mostrar la lista de bancos en la respuesta

3. **Prueba cargar los bancos:**
   Visita: `http://localhost:8080/api/openpay/banks`
   - Debería mostrar la lista de bancos PSE

### Archivos Modificados
- `.env` - Credenciales de Openpay configuradas
- `server-env.ts` - Nuevo script para cargar variables de entorno
- `src/server/openpay.server.ts` - Importa el script de carga de variables
- `src/routes/api/openpay/diagnostico.ts` - Importa el script de carga de variables

## 🔴 PROBLEMA ANTERIOR: Credenciales No Configuradas

El error que estás experimentando al cargar los bancos es porque las credenciales de Openpay todavía tienen los valores placeholder en el archivo `.env`.

**Solución inmediata:**
1. Edita el archivo `.env` en la raíz del proyecto
2. Reemplaza los valores placeholder con tus credenciales reales de Openpay
3. Reinicia el servidor de desarrollo

**Verifica la configuración:**
Visita: `http://localhost:8080/api/openpay/diagnostico` para ver el estado de tu configuración.

## Problemas Identificados y Soluciones

### 1. Error de Timeout de Supabase (Error 522 Cloudflare)

**Problema:** La aplicación estaba experimentando errores de conexión con Supabase (error 522 de Cloudflare), lo que causaba que toda la aplicación fallara.

**Solución Aplicada:**
- Se ha agregado manejo de errores robusto en `src/lib/public.functions.ts` para que cuando Supabase no esté disponible, la aplicación no falle completamente
- Se ha mejorado el manejo de errores en `src/routes/api/openpay/card-charge.ts` para hacer el pago con tarjeta más resistente a fallos de base de datos
- Las funciones ahora retornan valores por defecto en lugar de lanzar errores cuando Supabase no está disponible

### 2. Credenciales de Openpay No Configuradas

**Problema:** Las variables de entorno de Openpay no estaban configuradas en el archivo `.env`.

**Solución Aplicada:**
- Se han agregado las variables de entorno necesarias en el archivo `.env`
- Debes actualizar los valores con tus credenciales reales de Openpay

## Diagnóstico de Configuración

Antes de configurar las credenciales, puedes verificar el estado actual:

**Endpoint de diagnóstico:**
```
GET http://localhost:8080/api/openpay/diagnostico
```

Este endpoint te mostrará:
- Si las variables de entorno están configuradas
- Si hay valores placeholder
- Si el formato de las llaves es correcto
- Si la configuración general es válida

**Respuesta esperada cuando todo está correcto:**
```json
{
  "overall_status": {
    "ready": true,
    "message": "Configuración de Openpay parece correcta."
  }
}
```

**Respuesta cuando hay placeholders:**
```json
{
  "overall_status": {
    "ready": false,
    "has_placeholders": true,
    "message": "Las credenciales de Openpay tienen valores placeholder. Por favor actualiza el archivo .env con tus credenciales reales."
  }
}
```

## Configuración de Openpay

### Paso 1: Obtener Credenciales de Openpay

1. Inicia sesión en tu cuenta de Openpay: https://dashboard.openpay.co/
2. Ve a la sección de API Keys o Configuración
3. Copia las siguientes credenciales:
   - **Merchant ID**: Tu identificador de comercio
   - **Private Key**: Llave privada (comienza con `sk_`)
   - **Public Key**: Llave pública (comienza con `pk_`)

### Paso 2: Configurar Variables de Entorno

Edita el archivo `.env` en la raíz del proyecto y actualiza los siguientes valores:

```env
# Openpay Configuration
OPENPAY_MERCHANT_ID="tu_merchant_id_real"
OPENPAY_PRIVATE_KEY="sk_tu_llave_privada_real"
OPENPAY_PUBLIC_KEY="pk_tu_llave_publica_real"
OPENPAY_SANDBOX="true"  # Cambia a "false" para producción
```

**Importante:**
- `OPENPAY_SANDBOX="true"` usa el ambiente de pruebas (sandbox)
- `OPENPAY_SANDBOX="false"` usa el ambiente de producción
- Asegúrate de usar las llaves correctas para cada ambiente

### Paso 3: Configurar Webhook (Opcional pero Recomendado)

Para recibir notificaciones de pagos de Openpay:

1. En tu dashboard de Openpay, configura la URL del webhook:
   - URL de producción: `https://tu-dominio.com/api/public/openpay-webhook`
   - URL de desarrollo: `https://tu-dominio-dev.com/api/public/openpay-webhook`

2. Configura las credenciales de autenticación básica en el archivo `.env`:

```env
# Openpay Webhook Configuration (opcional)
OPENPAY_WEBHOOK_USER="tu_usuario_webhook"
OPENPAY_WEBHOOK_PASS="tu_contraseña_webhook"
```

3. En Openpay, configura las mismas credenciales para el webhook

## Solución del Problema de Supabase

### Opción 1: Esperar a que Supabase se Recupere

El error 522 de Cloudflare suele ser temporal. Si el problema persiste:

1. Verifica el estado de Supabase: https://status.supabase.com/
2. Contacta a soporte de Supabase si el problema continúa

### Opción 2: Verificar Configuración de Supabase

Asegúrate de tener la variable `SUPABASE_SERVICE_ROLE_KEY` configurada correctamente en el archivo `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"
```

Para obtener tu service role key:
1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a Settings > API
4. Copia la `service_role` (secret) key

**Advertencia:** NUNCA compartas la service role key públicamente.

## Métodos de Pago Implementados

### 1. QR Bre-B (Código QR)
- **Archivo:** `src/routes/api/openpay/breb-qr.ts`
- **Dependencia de Supabase:** NO
- **Estado:** Funciona independientemente de Supabase
- **Uso:** El cliente escanea un QR desde su app bancaria

### 2. PSE (Pago Electrónico)
- **Archivo:** `src/routes/api/openpay/pse.ts`
- **Dependencia de Supabase:** NO
- **Estado:** Funciona independientemente de Supabase
- **Uso:** Redirección al banco del cliente

### 3. Tarjeta de Crédito/Débito
- **Archivo:** `src/routes/api/openpay/card-charge.ts`
- **Dependencia de Supabase:** SÍ (para verificar órdenes y registrar pagos)
- **Estado:** Mejorado con manejo de errores, pero requiere Supabase para funcionalidad completa
- **Uso:** Tokenización segura de tarjeta

## Pruebas

### Prueba en Sandbox

1. Configura `OPENPAY_SANDBOX="true"` en `.env`
2. Usa las credenciales de sandbox de Openpay
3. Prueba cada método de pago:
   - **QR:** Genera un QR y simula el pago
   - **PSE:** Simula el flujo de PSE con datos de prueba
   - **Tarjeta:** Usa las tarjetas de prueba de Openpay

### Tarjetas de Prueba de Openpay

Para pruebas en sandbox, usa estas tarjetas:
- **Aprobada:** 4111111111111111
- **Rechazada:** 4000000000000002
- **Error:** 4012888888881881

Cualquier fecha futura y cualquier código CVV de 3 dígitos funcionará.

## Soporte

Si encuentras problemas:

1. **Error de Openpay:** Revisa la documentación: https://documents.openpay.co/api/index.html
2. **Error de Supabase:** Verifica el estado y configuración
3. **Error de aplicación:** Revisa los logs del servidor para más detalles

## Archivos Modificados

- `src/lib/public.functions.ts` - Manejo de errores mejorado
- `src/routes/api/openpay/card-charge.ts` - Resistencia a fallos de Supabase
- `src/routes/api/openpay/banks.ts` - Mejor manejo de errores con logging
- `src/routes/api/openpay/diagnostico.ts` - Nuevo endpoint de diagnóstico
- `.env` - Variables de entorno agregadas

## Pasos Inmediatos para Solucionar el Error

1. **Abre el archivo `.env`** en la raíz del proyecto
2. **Reemplaza los valores placeholder:**
   ```env
   OPENPAY_MERCHANT_ID="tu_merchant_id_real"
   OPENPAY_PRIVATE_KEY="sk_tu_llave_privada_real"
   OPENPAY_PUBLIC_KEY="pk_tu_llave_publica_real"
   ```
3. **Reinicia el servidor de desarrollo**
4. **Verifica la configuración** en: `http://localhost:8080/api/openpay/diagnostico`
5. **Intenta cargar los bancos** nuevamente

Si después de configurar las credenciales sigues teniendo problemas, el endpoint de diagnóstico te dará información específica sobre qué está mal.