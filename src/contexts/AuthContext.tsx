import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';

// Tipos para el contexto de autenticación
export interface UserProfile {
  id: string;
  email?: string;
  username?: string;
  role: 'manager' | 'operador';
  full_name?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isManager: boolean;
  isOperador: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Función para cargar el perfil del usuario desde metadatos
  const loadUserProfile = async (user: User): Promise<UserProfile | null> => {
    try {
      // Obtener metadatos del usuario
      const metadata = user.user_metadata || {};
      const appMetadata = user.app_metadata || {};
      
      // Construir perfil del usuario
      const profile: UserProfile = {
        id: user.id,
        email: user.email,
        username: metadata.username || null,
        role: appMetadata.role || metadata.role || 'operador', // Default a operador
        full_name: metadata.full_name || user.email?.split('@')[0] || 'Usuario',
        created_at: user.created_at
      };

      console.log('User profile loaded:', profile);
      return profile;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  };

  // Función de inicio de sesión
  const signIn = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      
      // Autenticación directa simplificada
      console.log('🔐 Attempting authentication for:', identifier);
      
      const authResult = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password,
      });

      if (authResult.error) {
        console.error('Authentication error:', authResult.error);
        return { 
          success: false, 
          error: 'Credenciales incorrectas. Verifica tu email y contraseña.'
        };
      }

      if (authResult.data.user) {
        const profile = await loadUserProfile(authResult.data.user);
        setUserProfile(profile);
        console.log('🔐 Sign in successful for user:', profile?.role);
        return { success: true };
      }

      return { success: false, error: 'Error inesperado durante la autenticación' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: 'Error de conexión. Intenta nuevamente.' 
      };
    } finally {
      setLoading(false);
    }
  };

  // Función de cierre de sesión
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      setSession(null);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Escuchar cambios en el estado de autenticación
  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          setLoading(false);
          return;
        }

        setSession(session);
        
        if (session?.user) {
          setUser(session.user);
          const profile = await loadUserProfile(session.user);
          setUserProfile(profile);
          console.log('Initial session restored for user:', profile?.role);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        
        if (session?.user) {
          setUser(session.user);
          const profile = await loadUserProfile(session.user);
          setUserProfile(profile);
        } else {
          setUser(null);
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Valores computados
  const isManager = userProfile?.role === 'manager';
  const isOperador = userProfile?.role === 'operador';
  const isAuthenticated = !!user && !!userProfile;

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    loading,
    signIn,
    signOut,
    isManager,
    isOperador,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};