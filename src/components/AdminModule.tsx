import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  Shield, 
  Bell, 
  Plus, 
  RefreshCw, 
  UserPlus, 
  X, 
  Save, 
  Eye, 
  EyeOff,
  Calendar,
  Mail,
  User,
  Crown,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2
} from 'lucide-react';
import AlertSettings from './AlertSettings';
import { supabase } from '../utils/supabaseClient';

interface AdminModuleProps {
  criticalItemsCount?: number;
}

// Interface para usuarios del sistema
interface SystemUser {
  id: string;
  email: string;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  username: string | null;
  full_name: string;
  role: 'manager' | 'operador';
  user_metadata: any;
  app_metadata: any;
}

// Interface para formulario de creación
interface CreateUserForm {
  username: string;
  password: string;
  role: 'manager' | 'operador';
  full_name: string;
  manager_email: string;
}

// Interface para datos combinados de usuario
interface CombinedUserData {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  role: 'manager' | 'operador';
}

// Toast Notification Component
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  }[type];

  const icon = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    info: <AlertCircle className="h-5 w-5" />
  }[type];

  return (
    <div className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md`}>
      {icon}
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

const AdminModule: React.FC<AdminModuleProps> = ({ criticalItemsCount = 0 }) => {
  const [activeTab, setActiveTab] = useState('alertas');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  // Estados para gestión de usuarios
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  
  // Estados para formulario de creación
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<CombinedUserData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
    username: '',
    password: '',
    role: 'operador',
    full_name: '',
    manager_email: ''
  });
  const [editUserForm, setEditUserForm] = useState<CreateUserForm>({
    username: '',
    password: '',
    role: 'operador',
    full_name: '',
    manager_email: ''
  });
  
  // Estado para toast notifications
  const [toast2, setToast2] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Función para mostrar toast
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  // Función para cancelar eliminación
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
    setIsProcessing(false);
  };

  // Función de validación del formulario
  const validateForm = (formData: CreateUserForm): { [key: string]: string } => {
    const errors: { [key: string]: string } = {};

    // Validación de username
    if (!formData.username.trim()) {
      errors.username = 'El nombre de usuario es obligatorio';
    } else if (formData.username.trim().length < 3) {
      errors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      errors.username = 'Solo se permiten letras, números y guiones bajos';
    }

    // Validación de contraseña
    if (!formData.password) {
      errors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    // Validación de email para managers
    if (formData.role === 'manager') {
      if (!formData.manager_email.trim()) {
        errors.manager_email = 'El email es obligatorio para managers';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.manager_email.trim())) {
        errors.manager_email = 'Formato de email inválido';
      }
    }

    return errors;
  };

  // useEffect para validación en tiempo real
  useEffect(() => {
    const errors = validateForm(createUserForm);
    setFormErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  }, [createUserForm]);

  // useEffect para validación del formulario de edición
  useEffect(() => {
    if (showEditForm) {
      const errors = validateForm(editUserForm);
      setFormErrors(errors);
      setIsFormValid(Object.keys(errors).length === 0);
    }
  }, [editUserForm, showEditForm]);

  // Función para abrir modal de edición
  const handleOpenEditModal = (user: SystemUser) => {
    console.log('🔧 Opening edit modal for user:', user.username);
    
    setEditingUser(user);
    setEditUserForm({
      username: user.username || '',
      password: '', // Password field will be optional for edits
      role: user.role,
      full_name: user.full_name || '',
      manager_email: user.role === 'manager' ? user.email : ''
    });
    setFormErrors({});
    setShowPassword(false);
    setShowEditForm(true);
  };

  // Función para editar usuario
  const handleEditUser = async () => {
    if (!editingUser) return;
    
    // Validar formulario antes de enviar
    const errors = validateForm(editUserForm);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      showToast('Por favor corrige los errores en el formulario', 'error');
      return;
    }

    setIsEditingUser(true);
    
    try {
      console.log('🔄 Editando usuario:', editUserForm);
      
      // Obtener token de sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const accessToken = session?.access_token;
      
      if (!supabaseUrl || !accessToken) {
        throw new Error('Configuración de Supabase no disponible');
      }

      // Preparar datos para actualización
      const updateData = {
        username: editUserForm.username.trim(),
        full_name: editUserForm.full_name.trim(),
        role: editUserForm.role,
        ...(editUserForm.password && editUserForm.password.trim() && { password: editUserForm.password.trim() })
      };

      console.log('Actualizando usuario:', editingUser.id, 'con datos:', { ...updateData, password: updateData.password ? '[REDACTED]' : undefined });

      // Llamada a la API con URL correcta incluyendo el ID del usuario
      const apiUrl = `${supabaseUrl}/functions/v1/manage-users/${editingUser.id}`;
      console.log('URL de la API:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error del servidor:', errorData);
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Usuario actualizado exitosamente:', result);
      
      // Mostrar mensaje de éxito
      showToast(`Usuario "${editUserForm.username}" actualizado exitosamente`, 'success');
      
      // Cerrar modal y limpiar formulario
      setShowEditForm(false);
      setEditingUser(null);
      setEditUserForm({
        username: '',
        password: '',
        role: 'operador',
        full_name: '',
        manager_email: ''
      });
      setFormErrors({});
      
      // Recargar lista de usuarios
      await loadUsers();
      
    } catch (error) {
      console.error('❌ Error editando usuario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showToast(`Error al editar usuario: ${errorMessage}`, 'error');
    } finally {
      setIsEditingUser(false);
    }
  };
  // Función para crear usuario
  const handleCreateUser = async () => {
    // Validar formulario antes de enviar
    const errors = validateForm(createUserForm);
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      showToast('Por favor corrige los errores en el formulario', 'error');
      return;
    }

    setIsCreatingUser(true);
    
    try {
      console.log('🔄 Creando usuario:', createUserForm);
      
      // Obtener token de sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      // Preparar datos para enviar
      const userData = {
        username: createUserForm.username.trim(),
        password: createUserForm.password,
        role: createUserForm.role,
        full_name: createUserForm.full_name.trim() || createUserForm.username.trim(),
        email: createUserForm.role === 'manager' ? createUserForm.manager_email.trim() : undefined
      };

      // Llamar a la Edge Function
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Usuario creado exitosamente:', result);
      
      // Mostrar mensaje de éxito
      showToast(`Usuario "${createUserForm.username}" creado exitosamente`, 'success');
      
      // Cerrar modal y limpiar formulario
      setShowCreateForm(false);
      setCreateUserForm({
        username: '',
        password: '',
        role: 'operador',
        full_name: '',
        manager_email: ''
      });
      setFormErrors({});
      
      // Recargar lista de usuarios
      await loadUsers();
      
    } catch (error) {
      console.error('❌ Error creando usuario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showToast(`Error al crear usuario: ${errorMessage}`, 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Función para eliminar usuario
  const handleDeleteUser = async (userId: string, username?: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserToDelete(user);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    
    try {
      console.log('🔄 Eliminando usuario:', userToDelete.id);
      
      // Obtener token de sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      // Llamar a la Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Usuario eliminado exitosamente:', result);
      
      // Mostrar mensaje de éxito
      showToast(`Usuario "${userToDelete.username || 'Usuario'}" eliminado exitosamente`, 'success');
      
      // Recargar lista de usuarios
      await loadUsers();
      
    } catch (error) {
      console.error('❌ Error eliminando usuario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showToast(`Error al eliminar usuario: ${errorMessage}`, 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  // Función para cargar usuarios desde Edge Function
  const loadUsers = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    
    try {
      console.log('🔄 Cargando usuarios desde Edge Function...');
      
      // Obtener token de sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      // Llamar a la Edge Function con método GET
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const userData = await response.json();
      console.log('✅ Respuesta de usuarios recibida:', userData);
      
      // Verificar que userData.users existe y es un array
      if (userData.success && Array.isArray(userData.users)) {
        setUsers(userData.users);
        console.log('✅ Usuarios cargados exitosamente:', userData.users.length, 'usuarios');
        showToast(`${userData.users.length} usuarios cargados correctamente`, 'success');
      } else {
        console.error('❌ Respuesta de API no contiene array de usuarios:', userData);
        setUsers([]);
        setUsersError('Formato de respuesta inválido');
      }
      
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setUsersError(errorMessage);
      setUsers([]);
      showToast(`Error al cargar usuarios: ${errorMessage}`, 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Función para mostrar toast notifications
  const showToast2 = (message: string, type: 'success' | 'error' | 'info') => {
    setToast2({ message, type });
  };

  // Función para cargar usuarios desde Edge Function
  const loadUsers2 = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    
    try {
      console.log('🔄 Cargando usuarios desde Edge Function...');
      
      // Obtener token de sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      // Llamar a la Edge Function con método GET
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const userData = await response.json();
      console.log('✅ Respuesta de usuarios recibida:', userData);
      
      // Verificar que userData.users existe y es un array
      if (userData.success && Array.isArray(userData.users)) {
        setUsers(userData.users);
        console.log('✅ Usuarios cargados exitosamente:', userData.users.length, 'usuarios');
        showToast(`${userData.users.length} usuarios cargados correctamente`, 'success');
      } else {
        console.error('❌ Respuesta de API no contiene array de usuarios:', userData);
        setUsers([]);
        setUsersError('Formato de respuesta inválido');
      }
      
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setUsersError(errorMessage);
      setUsers([]);
      showToast(`Error al cargar usuarios: ${errorMessage}`, 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Cargar usuarios automáticamente al cambiar a la pestaña de usuarios
  React.useEffect(() => {
    if (activeTab === 'usuarios') {
      // Solo cargar si no hay usuarios cargados previamente
      if (users.length === 0) {
        loadUsersQuietly();
      }
    }
  }, [activeTab]);

  // Función para cargar usuarios sin mostrar toast (para carga automática)
  const loadUsersQuietly = async () => {
    setLoadingUsers(true);
    setUsersError(null);
    
    try {
      console.log('🔄 Cargando usuarios silenciosamente...');
      
      // Obtener token de sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      // Llamar a la Edge Function con método GET
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const userData = await response.json();
      
      // Verificar que userData.users existe y es un array
      if (userData.success && Array.isArray(userData.users)) {
        setUsers(userData.users);
        console.log('✅ Usuarios cargados silenciosamente:', userData.users.length, 'usuarios');
        // NO mostrar toast en carga automática
      } else {
        console.error('❌ Respuesta de API no contiene array de usuarios:', userData);
        setUsers([]);
        setUsersError('Formato de respuesta inválido');
      }
      
    } catch (error) {
      console.error('❌ Error cargando usuarios silenciosamente:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setUsersError(errorMessage);
      setUsers([]);
      // Solo mostrar toast en caso de error
      showToast(`Error al cargar usuarios: ${errorMessage}`, 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const tabs = [
    { id: 'alertas', label: 'Alertas', icon: Bell },
    { id: 'usuarios', label: 'Usuarios', icon: Users }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-8 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100">
                <Settings className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
                <p className="text-lg text-gray-600 mt-2">
                  Configuración avanzada del sistema StockFlow
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
              <Shield className="h-4 w-4" />
              Admin Access
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="px-6">
            <nav className="flex space-x-8" aria-label="Admin Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200
                      ${isActive
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div>
          {/* Alertas Tab */}
          {activeTab === 'alertas' && (
            <div className="p-4 sm:p-6 lg:p-8">
              <AlertSettings criticalItemsCount={criticalItemsCount} />
            </div>
          )}

          {/* Usuarios Tab - Placeholder */}
          {activeTab === 'usuarios' && (
            <div className="p-4 sm:p-6 lg:p-8">
              <>
                {/* Header de Usuarios */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-purple-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
                    {users.length > 0 && (
                      <span className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">
                        {users.length} usuarios
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={loadUsers}
                      disabled={loadingUsers}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingUsers ? 'animate-spin' : ''}`} />
                      Actualizar
                    </button>
                    
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                    >
                      <UserPlus className="h-4 w-4" />
                      + Crear Nuevo Operador
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {usersError && (
                  <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                      <div>
                        <p className="text-sm text-red-700 font-medium">Error al cargar usuarios</p>
                        <p className="text-xs text-red-600 mt-1">{usersError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {loadingUsers ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center gap-3">
                      <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                      <span className="text-gray-600 font-medium">Cargando usuarios...</span>
                    </div>
                  </div>
                ) : users.length === 0 ? (
                  /* Empty State */
                  <div className="text-center py-16 bg-gray-50 rounded-lg">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay usuarios registrados</h3>
                    <p className="text-gray-400 mb-4">Crea el primer usuario del sistema</p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                    >
                      <UserPlus className="h-4 w-4" />
                      Crear Primer Usuario
                    </button>
                  </div>
                ) : (
                  /* Users Table */
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                              Usuario
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                              Rol
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                              Fecha Creación
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                              Último Acceso
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.map((user) => {
                            const fechaCreacion = new Date(user.created_at).toLocaleDateString('es-ES');
                            const ultimoAcceso = user.last_sign_in_at 
                              ? new Date(user.last_sign_in_at).toLocaleDateString('es-ES')
                              : 'Nunca';
                            
                            return (
                              <tr 
                                key={user.id}
                                className="hover:bg-gray-50 transition-colors duration-150"
                              >
                                {/* Usuario */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                        user.role === 'manager' 
                                          ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                                          : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                      }`}>
                                        {user.role === 'manager' ? (
                                          <Crown className="h-5 w-5 text-white" />
                                        ) : (
                                          <User className="h-5 w-5 text-white" />
                                        )}
                                      </div>
                                    </div>
                                    <div className="ml-4">
                                      <div className="text-sm font-semibold text-gray-900">
                                        {user.username || 'Sin username'}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {user.full_name}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                
                                {/* Email */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                                    <span className="text-sm text-gray-900">{user.email}</span>
                                  </div>
                                </td>
                                
                                {/* Rol */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                    user.role === 'manager'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                                  }`}>
                                    {user.role === 'manager' ? 'MANAGER' : 'OPERADOR'}
                                  </span>
                                </td>
                                
                                {/* Fecha Creación */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                                    <span className="text-sm text-gray-900">{fechaCreacion}</span>
                                  </div>
                                </td>
                                
                                {/* Último Acceso */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`text-sm ${
                                    ultimoAcceso === 'Nunca' ? 'text-gray-400' : 'text-gray-900'
                                  }`}>
                                    {ultimoAcceso}
                                  </span>
                                </td>
                                
                                {/* Acciones */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {user.role !== 'manager' ? (
                                      <>
                                        <button
                                          onClick={() => {
                                            handleOpenEditModal(user);
                                          }}
                                          className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded-lg transition-all duration-200 text-sm font-medium"
                                          title="Editar usuario"
                                        >
                                          <Edit className="h-3 w-3" />
                                          Editar
                                        </button>
                                        
                                        <button
                                          onClick={() => {}} 
                                          disabled={true}
                                          className="flex items-center gap-1 bg-gray-400 text-gray-600 px-3 py-1 rounded-lg text-sm font-medium cursor-not-allowed"
                                          title="Eliminar usuario"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                          Eliminar
                                        </button>
                                      </>
                                    ) : (
                                      <span className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-sm font-medium">
                                        <Shield className="h-3 w-3" />
                                        Protegido
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-gray-200">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-200 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-red-900">Confirmar Eliminación</h3>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  ¿Estás seguro de que deseas eliminar este usuario?
                </p>
                
                {/* Información del usuario a eliminar */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-200">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {userToDelete.full_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {userToDelete.username ? `@${userToDelete.username}` : userToDelete.email}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        userToDelete.role === 'manager' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {userToDelete.role === 'manager' ? 'Manager' : 'Operador'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">
                    ⚠️ Esta acción no se puede deshacer
                  </p>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
                
                <button
                  onClick={confirmDeleteUser}
                  disabled={isDeleting}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                >
                  {isDeleting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Creación de Usuario */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <UserPlus className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Crear Nuevo Usuario</h3>
                </div>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateUserForm({
                      username: '',
                      password: '',
                      role: 'operador',
                      full_name: '',
                      manager_email: ''
                    });
                    setFormErrors({});
                    setShowPassword(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }} className="space-y-4">
                {/* Nombre de Usuario */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de Usuario *
                  </label>
                  <input
                    type="text"
                    value={createUserForm.username}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, username: e.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                      formErrors.username ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="nombre_usuario"
                    disabled={isCreatingUser}
                  />
                  {formErrors.username && (
                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.username}
                    </p>
                  )}
                </div>

                {/* Nombre Completo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={createUserForm.full_name}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    placeholder="Nombre completo del usuario"
                    disabled={isCreatingUser}
                  />
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={createUserForm.password}
                      onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                      className={`w-full rounded-lg border px-3 py-2 pr-10 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                        formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="••••••••"
                      disabled={isCreatingUser}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={isCreatingUser}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.password}
                    </p>
                  )}
                </div>

                {/* Rol */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol del Usuario *
                  </label>
                  <select
                    value={createUserForm.role}
                    onChange={(e) => setCreateUserForm(prev => ({ 
                      ...prev, 
                      role: e.target.value as 'manager' | 'operador',
                      manager_email: e.target.value === 'operador' ? '' : prev.manager_email // Limpiar email si cambia a operador
                    }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    disabled={isCreatingUser}
                  >
                    <option value="operador">Operador</option>
                    <option value="manager">Manager</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {createUserForm.role === 'manager' 
                      ? 'Acceso completo al sistema' 
                      : 'Acceso limitado a operaciones básicas'
                    }
                  </p>
                </div>

                {/* Email para Manager */}
                {createUserForm.role === 'manager' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email del Manager *
                    </label>
                    <input
                      type="email"
                      value={createUserForm.manager_email}
                      onChange={(e) => setCreateUserForm(prev => ({ ...prev, manager_email: e.target.value }))}
                      className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                        formErrors.manager_email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="manager@empresa.com"
                      disabled={isCreatingUser}
                    />
                    {formErrors.manager_email && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.manager_email}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Los managers requieren un email válido para autenticación
                    </p>
                  </div>
                )}

                {/* Botones del Modal */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateUserForm({
                        username: '',
                        password: '',
                        role: 'operador',
                        full_name: '',
                        manager_email: ''
                      });
                      setFormErrors({});
                      setShowPassword(false);
                    }}
                    disabled={isCreatingUser}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    type="submit"
                    disabled={!isFormValid || isCreatingUser}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                  >
                    {isCreatingUser ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Crear Usuario
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición de Usuario */}
      {showEditForm && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Edit className="h-5 w-5 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Editar Usuario</h3>
                </div>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingUser(null);
                    setEditUserForm({
                      username: '',
                      password: '',
                      role: 'operador',
                      full_name: '',
                      manager_email: ''
                    });
                    setFormErrors({});
                    setShowPassword(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleEditUser(); }} className="space-y-4">
                {/* Nombre de Usuario */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de Usuario *
                  </label>
                  <input
                    type="text"
                    value={editUserForm.username}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, username: e.target.value }))}
                    className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 ${
                      formErrors.username ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="nombre_usuario"
                    disabled={isEditingUser}
                  />
                  {formErrors.username && (
                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.username}
                    </p>
                  )}
                </div>

                {/* Nombre Completo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={editUserForm.full_name}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                    placeholder="Nombre completo del usuario"
                    disabled={isEditingUser}
                  />
                </div>

                {/* Contraseña (Opcional para edición) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nueva Contraseña (opcional)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={editUserForm.password}
                      onChange={(e) => setEditUserForm(prev => ({ ...prev, password: e.target.value }))}
                      className={`w-full rounded-lg border px-3 py-2 pr-10 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 ${
                        formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Dejar vacío para mantener actual"
                      disabled={isEditingUser}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={isEditingUser}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {formErrors.password && (
                    <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.password}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Dejar vacío para mantener la contraseña actual
                  </p>
                </div>

                {/* Rol */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol del Usuario *
                  </label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm(prev => ({ 
                      ...prev, 
                      role: e.target.value as 'manager' | 'operador',
                      manager_email: e.target.value === 'operador' ? '' : prev.manager_email
                    }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                    disabled={isEditingUser}
                  >
                    <option value="operador">Operador</option>
                    <option value="manager">Manager</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {editUserForm.role === 'manager' 
                      ? 'Acceso completo al sistema' 
                      : 'Acceso limitado a operaciones básicas'
                    }
                  </p>
                </div>

                {/* Email para Manager */}
                {editUserForm.role === 'manager' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email del Manager *
                    </label>
                    <input
                      type="email"
                      value={editUserForm.manager_email}
                      onChange={(e) => setEditUserForm(prev => ({ ...prev, manager_email: e.target.value }))}
                      className={`w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 ${
                        formErrors.manager_email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="manager@empresa.com"
                      disabled={isEditingUser}
                    />
                    {formErrors.manager_email && (
                      <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.manager_email}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Los managers requieren un email válido para autenticación
                    </p>
                  </div>
                )}

                {/* Botones del Modal */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingUser(null);
                      setEditUserForm({
                        username: '',
                        password: '',
                        role: 'operador',
                        full_name: '',
                        manager_email: ''
                      });
                      setFormErrors({});
                      setShowPassword(false);
                    }}
                    disabled={isEditingUser}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    type="submit"
                    disabled={!isFormValid || isEditingUser}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                  >
                    {isEditingUser ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Actualizar Usuario
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AdminModule;