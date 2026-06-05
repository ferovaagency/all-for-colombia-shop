
# Migración de seguridad en 4 pasos

Cada paso es una migración independiente. Después de cada uno te aviso qué probar antes de continuar con el siguiente.

---

## Paso 1 — Distribuidores (urgente: contraseñas en texto plano)

**Cambios DB:**
- Agregar columna `auth_user_id uuid` a `distributors` (FK a `auth.users`).
- Trigger: cuando se aprueba un distributor (`status = 'approved'`), crear su usuario en Supabase Auth con su email + password actual (hasheado por Supabase automáticamente).
- Borrar columna `password_hash` después de migrar.
- Reemplazar políticas: SELECT/UPDATE en `distributors` → `auth.uid() = auth_user_id`. SELECT/INSERT en `distributor_orders` y `distributor_order_items` → solo del distributor dueño (vía `distributor_id` join).

**Cambios código:**
- `distribuidores.index.tsx`: el form de login llama a `supabase.auth.signInWithPassword({ email, password })` en vez de query directa.
- `distribuidores.portal.tsx`: en vez de leer `localStorage`, suscribirse a `onAuthStateChange` y leer el `distributor` desde la tabla con el `auth.uid()`.
- Portal pasa a ser ruta `_authenticated/` con redirección a `/distribuidores` si no hay sesión.
- Para distribuidores existentes en producción: script que crea sus cuentas Auth con su password actual (única vez).

**Qué probarás:** registrarse como distribuidor nuevo, aprobarlo desde admin, iniciar sesión, ver pedidos.

---

## Paso 2 — Admin (products, categories, brands, blogs, storage)

**Cambios DB:**
- Crear enum `app_role` con valor `admin`.
- Crear tabla `user_roles (user_id, role)` con función `has_role(uuid, app_role)` (SECURITY DEFINER).
- Reemplazar políticas `USING (true)` en `products`, `categories`, `brands`, `blogs`, `blog_posts` por: SELECT público, INSERT/UPDATE/DELETE solo si `has_role(auth.uid(), 'admin')`.
- Storage `product-images`: SELECT público, write solo admin. Eliminar el listing público.

**Cambios código:**
- Nueva ruta `/auth` (login email+password + Google) para admins.
- Mover `src/routes/admin.*` bajo `src/routes/_authenticated/` con guard que verifica `has_role(uid, 'admin')`.
- Activar leaked-password protection (HIBP).

**Qué probarás:** crear tu usuario admin, asignar rol manualmente la primera vez, editar productos/marcas/blogs.

---

## Paso 3 — Customers / orders / availability_requests

**Cambios DB:**
- Cambiar políticas: SELECT solo admin, INSERT permitido para anon (checkout funciona sin login).
- O alternativa: mover el INSERT del checkout a un server function (`createServerFn` + `supabaseAdmin`) que valida y escribe.

**Cambios código:**
- `checkout.tsx` y `producto.$slug.tsx` (availability request) escriben vía server function nuevo.
- Admin order views protegidas por rol admin.

**Qué probarás:** completar checkout como invitado, recibir order en admin.

---

## Paso 4 — Chat / reviews

**Cambios DB:**
- `ai_conversations` y `chat_conversations`: SELECT solo si `session_id = current_setting('request.headers')::json->>'x-session-id'` o admin. Inserts vía server functions / edge functions (que ya usan service role).
- `product_reviews`: SELECT público, INSERT/UPDATE solo del dueño (vía auth.uid) o admin.

**Cambios código:**
- Edge functions ya usan service role, solo confirmamos.
- Si hay UI de reviews que permite escribir sin login, requerir login.

**Qué probarás:** chat con Ali sigue funcionando, no se ven conversaciones de otros usuarios.

---

## Empiezo con el Paso 1 ahora

Una vez confirmes el plan, lanzo la migración del Paso 1 y los cambios de código asociados. Después de que pruebes el login de distribuidores, sigo con el Paso 2.
