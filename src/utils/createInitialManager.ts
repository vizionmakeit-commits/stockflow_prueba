import { supabase } from './supabaseClient';

/**
 * SCRIPT AISLADO PARA CREAR USUARIO MANAGER INICIAL
 * 
 * Este script crea el usuario administrador principal usando la API de Supabase.
 * Solo debe ejecutarse UNA VEZ para configurar el sistema.
 * 
 * INSTRUCCIONES DE USO:
 * 1. Abrir la consola del navegador (F12)
 * 2. Importar y ejecutar: 
 *    import('./utils/createInitialManager.js').then(m => m.createInitialManager())
 * 3. Verificar los mensajes de éxito/error en la consola
 * 4. Hacer login con las credenciales creadas
 */

interface CreateUserResult {
  success: boolean;
  message: string;
  credentials?: {
    email: string;
    password: string;
  };
}

export const createInitialManager = async (): Promise<CreateUserResult> => {
  try {
    console.log('🚀 INICIANDO CREACIÓN DE USUARIO MANAGER...');
    
    // Validar variables de entorno
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      const errorMsg = '❌ ERROR: Variables de entorno de Supabase no configuradas';
      console.error(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }

    console.log('✅ Variables de entorno validadas');
    console.log('📍 Supabase URL:', supabaseUrl);

    // Datos del usuario manager
    const managerData = {
      email: 'admin@stockflow.com',
      password: 'StockFlow2025!',
      email_confirm: true,
      user_metadata: {
        username: 'admin',
        full_name: 'Administrador Principal',
        role: 'manager'
      },
      app_metadata: {
        role: 'manager'
      }
    };

    console.log('👤 Creando usuario con email:', managerData.email);

    // Intentar crear el usuario usando la API de administración
    const { data, error } = await supabase.auth.admin.createUser(managerData);

    if (error) {
      // Si el usuario ya existe, no es un error crítico
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        const successMsg = '⚠️ USUARIO YA EXISTE: El usuario manager ya está creado';
        console.warn(successMsg);
        return {
          success: true,
          message: successMsg,
          credentials: {
            email: managerData.email,
            password: managerData.password
          }
        };
      }

      const errorMsg = `❌ ERROR CREANDO USUARIO: ${error.message}`;
      console.error(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }

    if (!data.user) {
      const errorMsg = '❌ ERROR: No se recibió información del usuario creado';
      console.error(errorMsg);
      return {
        success: false,
        message: errorMsg
      };
    }

    const successMsg = '✅ USUARIO MANAGER CREADO EXITOSAMENTE';
    console.log(successMsg);
    console.log('📧 Email:', data.user.email);
    console.log('🆔 ID:', data.user.id);
    console.log('👑 Rol:', data.user.app_metadata?.role);
    console.log('📅 Creado:', data.user.created_at);

    return {
      success: true,
      message: successMsg,
      credentials: {
        email: managerData.email,
        password: managerData.password
      }
    };

  } catch (error) {
    const errorMsg = `❌ ERROR CRÍTICO: ${error instanceof Error ? error.message : 'Error desconocido'}`;
    console.error(errorMsg);
    console.error('Stack trace:', error);
    
    return {
      success: false,
      message: errorMsg
    };
  }
};

/**
 * FUNCIÓN DE VERIFICACIÓN
 * Verifica si el usuario manager ya existe
 */
export const checkManagerExists = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error checking users:', error);
      return false;
    }

    const managerExists = data.users.some(user => 
      user.email === 'admin@stockflow.com' || 
      user.app_metadata?.role === 'manager'
    );

    console.log('🔍 Manager exists:', managerExists);
    return managerExists;
  } catch (error) {
    console.error('Error in checkManagerExists:', error);
    return false;
  }
};

/**
 * FUNCIÓN PRINCIPAL PARA EJECUTAR DESDE CONSOLA
 */
export const setupInitialUser = async (): Promise<void> => {
  console.log('🎯 CONFIGURACIÓN INICIAL DE USUARIO MANAGER');
  console.log('================================================');
  
  // Verificar si ya existe
  const exists = await checkManagerExists();
  
  if (exists) {
    console.log('⚠️ El usuario manager ya existe. Credenciales:');
    console.log('📧 Email: admin@stockflow.com');
    console.log('🔑 Password: StockFlow2025!');
    return;
  }

  // Crear usuario
  const result = await createInitialManager();
  
  if (result.success && result.credentials) {
    console.log('🎉 CONFIGURACIÓN COMPLETADA');
    console.log('================================================');
    console.log('📧 Email:', result.credentials.email);
    console.log('🔑 Password:', result.credentials.password);
    console.log('================================================');
    console.log('💡 PRÓXIMO PASO: Hacer login con estas credenciales');
  } else {
    console.log('💥 CONFIGURACIÓN FALLÓ');
    console.log('================================================');
    console.log('❌ Error:', result.message);
  }
};