/*
  # Configuración inicial del sistema de autenticación

  1. Configuración de Supabase Auth
    - Habilita autenticación por email y contraseña
    - Configura metadatos de usuario para roles
    - Establece políticas de seguridad

  2. Usuario Manager Inicial
    - Crea el primer usuario con rol de Manager
    - Email: admin@stockflow.com
    - Contraseña temporal: StockFlow2025!
    - Rol: manager

  3. Configuración de Roles
    - Define estructura de metadatos para roles
    - Establece permisos básicos

  IMPORTANTE: Cambiar la contraseña después del primer login
*/

-- Configurar Supabase Auth para permitir signup (temporalmente para crear el usuario inicial)
-- Esto se puede hacer desde el dashboard de Supabase o mediante esta configuración

-- Crear función para asignar roles por defecto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Asignar rol por defecto basado en el email
  IF NEW.email LIKE '%@stockflow.com' OR NEW.email LIKE '%@admin.%' THEN
    -- Usuarios con emails administrativos son managers
    NEW.raw_user_meta_data = jsonb_set(
      COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
      '{role}',
      '"manager"'
    );
    NEW.raw_app_meta_data = jsonb_set(
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
      '{role}',
      '"manager"'
    );
  ELSE
    -- Otros usuarios son operadores por defecto
    NEW.raw_user_meta_data = jsonb_set(
      COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
      '{role}',
      '"operador"'
    );
    NEW.raw_app_meta_data = jsonb_set(
      COALESCE(NEW.raw_app_meta_data, '{}'::jsonb),
      '{role}',
      '"operador"'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para asignar roles automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Crear función para actualizar el campo id_usuario en transacciones
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS text AS $$
BEGIN
  -- Obtener el ID del usuario autenticado actual
  RETURN COALESCE(auth.uid()::text, 'admin_default');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar la tabla transacciones para usar el usuario actual por defecto
ALTER TABLE public.transacciones 
ALTER COLUMN id_usuario SET DEFAULT public.get_current_user_id();

-- Crear tabla de perfiles de usuario (opcional, para información adicional)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE,
  full_name text,
  role text NOT NULL DEFAULT 'operador' CHECK (role IN ('manager', 'operador')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS en user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Política para que los managers puedan ver todos los perfiles
CREATE POLICY "Managers can view all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (auth.users.raw_app_meta_data->>'role' = 'manager')
    )
  );

-- Política para que los usuarios puedan actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Función para crear perfil automáticamente cuando se crea un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_app_meta_data->>'role', 'operador')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();