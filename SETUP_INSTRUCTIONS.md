# Configuración Inicial del Sistema de Autenticación

## Paso 1: Ejecutar la Migración
La migración `create_initial_manager_user.sql` ya está aplicada y ha configurado:
- ✅ Funciones para asignación automática de roles
- ✅ Tabla de perfiles de usuario
- ✅ Políticas de seguridad (RLS)
- ✅ Triggers automáticos

## Paso 2: Crear el Usuario Manager Inicial

### Opción A: Desde Supabase Dashboard (Recomendado)
1. Ve a tu proyecto de Supabase Dashboard
2. Navega a **Authentication > Users**
3. Haz clic en **"Add user"**
4. Completa los datos:
   - **Email:** `admin@stockflow.com`
   - **Password:** `StockFlow2025!`
   - **Email Confirm:** ✅ (marcado)
5. Después de crear el usuario, ve a la pestaña **"Raw User Meta Data"**
6. Agrega este JSON:
```json
{
  "role": "manager",
  "full_name": "Administrador Principal",
  "username": "admin"
}
```

### Opción B: Mediante SQL (Avanzado)
Si tienes acceso directo a la base de datos, puedes ejecutar:

```sql
-- Insertar usuario directamente en auth.users (requiere permisos de servicio)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@stockflow.com',
  crypt('StockFlow2025!', gen_salt('bf')),
  now(),
  '{"role": "manager"}',
  '{"role": "manager", "full_name": "Administrador Principal", "username": "admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);
```

## Paso 3: Verificar la Configuración
1. Abre la aplicación StockFlow
2. Deberías ver la página de login
3. Inicia sesión con:
   - **Email:** `admin@stockflow.com`
   - **Contraseña:** `StockFlow2025!`
4. Verifica que tengas acceso completo como Manager

## Paso 4: Cambiar Contraseña (Recomendado)
1. Una vez logueado, ve al módulo de Administración
2. Cambia la contraseña por una más segura
3. Actualiza las credenciales en tu documentación

## Crear Usuarios Operadores
Para crear usuarios operadores:
1. Usa emails normales (no @stockflow.com)
2. O crea usuarios con username en lugar de email
3. El sistema asignará automáticamente el rol "operador"

## Troubleshooting
- Si no puedes crear usuarios, verifica que el signup esté habilitado en Supabase Dashboard
- Si los roles no se asignan, verifica que los triggers estén activos
- Para problemas de permisos, revisa las políticas RLS

## Seguridad
- ✅ RLS habilitado en todas las tablas
- ✅ Roles asignados automáticamente
- ✅ Políticas de acceso por rol
- ✅ Sesiones seguras con JWT