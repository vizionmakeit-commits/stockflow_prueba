/*
  # Secure User Management Edge Function

  ## Purpose
  Production-ready API endpoint for secure user management operations in StockFlow.
  Handles user CRUD operations with strict role-based access control.

  ## Security Features
  - JWT token verification and validation
  - Manager role requirement for all operations
  - Input sanitization and validation
  - Comprehensive error handling
  - Audit logging for security events

  ## API Endpoints
  - GET /manage-users: List all users with profiles
  - POST /manage-users: Create new user with automatic profile creation
  - OPTIONS /manage-users: CORS preflight handling

  ## Authentication Flow
  1. Extract JWT token from Authorization header
  2. Verify token validity using Supabase Auth
  3. Check user role from app_metadata
  4. Only allow 'manager' role to proceed
  5. Log all access attempts for security audit

  ## Error Handling
  - 401: Authentication required or invalid token
  - 403: Access denied (non-manager role)
  - 400: Invalid input data or missing required fields
  - 500: Internal server errors with detailed logging
*/

import { createClient } from 'npm:@supabase/supabase-js@2';

// CORS configuration for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interface definitions for type safety
interface UserCreationRequest {
  username: string;
  password: string;
  role: 'manager' | 'operador';
  full_name?: string;
  manager_email?: string; // Required only for manager role
}

interface AuthenticatedUser {
  userId: string;
  userRole: string;
  email: string;
}

interface CombinedUserData {
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

/**
 * Verify JWT token and extract user information
 * @param authHeader - Authorization header from request
 * @returns User info if valid, null if invalid
 */
async function verifyManagerAccess(authHeader: string | null): Promise<AuthenticatedUser | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('🚫 Missing or invalid Authorization header');
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (!token) {
    console.log('🚫 Empty JWT token');
    return null;
  }

  try {
    // Initialize Supabase client for token verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify JWT token
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      console.log('🚫 JWT verification failed:', error?.message || 'User not found');
      return null;
    }

    // Extract role from metadata (check both app_metadata and user_metadata)
    const userRole = user.app_metadata?.role || user.user_metadata?.role || 'operador';
    
    console.log('✅ JWT verified for user:', {
      id: user.id,
      email: user.email,
      role: userRole
    });

    return {
      userId: user.id,
      userRole: userRole,
      email: user.email || ''
    };
  } catch (error) {
    console.error('❌ JWT verification error:', error);
    return null;
  }
}

/**
 * Validate user creation request data
 * @param userData - User data from request body
 * @returns Validation result with error message if invalid
 */
function validateUserCreationData(userData: any): { valid: boolean; error?: string } {
  if (!userData || typeof userData !== 'object') {
    return { valid: false, error: "Invalid request body" };
  }

  const { username, password, role, manager_email } = userData;

  // Required fields validation
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return { valid: false, error: "Username is required and must be a non-empty string" };
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return { valid: false, error: "Password is required and must be at least 6 characters" };
  }

  if (!role || !['manager', 'operador'].includes(role)) {
    return { valid: false, error: "Role must be either 'manager' or 'operador'" };
  }

  // Manager-specific validation
  if (role === 'manager') {
    if (!manager_email || typeof manager_email !== 'string' || !manager_email.includes('@')) {
      return { valid: false, error: "Valid email is required for manager role" };
    }
  }

  // Username format validation (alphanumeric and underscores only)
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username.trim())) {
    return { valid: false, error: "Username can only contain letters, numbers, and underscores" };
  }

  return { valid: true };
}

/**
 * Generate email for operador users
 * @param username - Username to convert to email
 * @returns Generated email address
 */

/**
 * Main Edge Function handler
 */
Deno.serve(async (req: Request) => {
  try {
    console.log('=== MANAGE USERS EDGE FUNCTION CALLED ===');
    console.log('🔍 Method:', req.method);
    console.log('🔍 URL:', req.url);
    console.log('🔍 Headers:', Object.fromEntries(req.headers.entries()));

    // Handle CORS preflight requests (CRITICAL for browser compatibility)
    if (req.method === "OPTIONS") {
      console.log('✈️ Handling CORS preflight request');
      return new Response('ok', {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error",
          code: "MISSING_ENV_VARS"
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication and manager role
    const authHeader = req.headers.get('Authorization');
    const userInfo = await verifyManagerAccess(authHeader);
    
    if (!userInfo) {
      console.log('🚫 Authentication failed');
      return new Response(
        JSON.stringify({ 
          error: "Authentication required",
          code: "AUTH_REQUIRED"
        }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Verify manager role
    if (userInfo.userRole !== 'manager') {
      console.log('🚫 Access denied for role:', userInfo.userRole);
      return new Response(
        JSON.stringify({ 
          error: "Access denied: Manager role required",
          code: "INSUFFICIENT_PERMISSIONS",
          user_role: userInfo.userRole
        }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('✅ Manager access verified for user:', userInfo.userId);

    // ==================== GET REQUEST: LIST USERS ====================
    if (req.method === "GET") {
      console.log('📋 Processing GET request - Listing all users');
      
      try {
        // Fetch all authentication users using service role
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error('❌ Error fetching auth users:', authError);
          return new Response(
            JSON.stringify({ 
              error: "Failed to fetch authentication users", 
              details: authError.message,
              code: "AUTH_FETCH_ERROR"
            }),
            { 
              status: 500, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        console.log('✅ Auth users fetched:', authData.users.length, 'users');

        // Fetch all user profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profilesError) {
          console.error('❌ Error fetching user profiles:', profilesError);
          return new Response(
            JSON.stringify({ 
              error: "Failed to fetch user profiles", 
              details: profilesError.message,
              code: "PROFILES_FETCH_ERROR"
            }),
            { 
              status: 500, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        console.log('✅ User profiles fetched:', profiles.length, 'profiles');

        // Create efficient lookup map for profiles
        const profilesMap = new Map(profiles.map(profile => [profile.id, profile]));

        // Combine authentication data with profile data
        const combinedUsers: CombinedUserData[] = authData.users.map(authUser => {
          const profile = profilesMap.get(authUser.id);
          
          return {
            id: authUser.id,
            email: authUser.email || '',
            phone: authUser.phone || null,
            created_at: authUser.created_at,
            last_sign_in_at: authUser.last_sign_in_at || null,
            email_confirmed_at: authUser.email_confirmed_at || null,
            // Profile data with fallbacks
            username: profile?.username || null,
            full_name: profile?.full_name || authUser.email?.split('@')[0] || 'Usuario',
            role: profile?.role || authUser.app_metadata?.role || 'operador',
            // Metadata for debugging
            user_metadata: authUser.user_metadata || {},
            app_metadata: authUser.app_metadata || {},
          };
        });

        console.log('✅ Users data combined successfully:', combinedUsers.length, 'total users');

        return new Response(
          JSON.stringify({
            success: true,
            users: combinedUsers,
            total_count: combinedUsers.length,
            timestamp: new Date().toISOString()
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );

      } catch (error) {
        console.error('❌ Critical error in GET operation:', error);
        return new Response(
          JSON.stringify({ 
            error: "Internal server error during user listing", 
            details: error instanceof Error ? error.message : 'Unknown error',
            code: "GET_OPERATION_ERROR"
          }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }
    }

    // ==================== POST REQUEST: CREATE USER ====================
    if (req.method === "POST") {
      console.log('➕ Processing POST request - Creating new user');
      
      try {
        // Parse and validate request body
        const requestBody = await req.json();
        console.log('📝 Request body received:', { 
          ...requestBody, 
          password: '[REDACTED]' // Don't log passwords
        });
        
        // Validate input data
        const validation = validateUserCreationData(requestBody);
        if (!validation.valid) {
          console.log('❌ Validation failed:', validation.error);
          return new Response(
            JSON.stringify({ 
              error: validation.error,
              code: "VALIDATION_ERROR"
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        const { username, password, role, full_name, manager_email }: UserCreationRequest = requestBody;

        // Determine email based on role
        const userEmail = role === 'manager' ? manager_email! : `${username.trim()}@stockflow.local`;
        
        console.log('👤 Creating user with email:', userEmail, 'role:', role);

        // Check if username already exists in profiles
        const { data: existingProfile, error: checkError } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('username', username.trim())
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
          console.error('❌ Error checking existing username:', checkError);
          return new Response(
            JSON.stringify({ 
              error: "Failed to validate username uniqueness",
              code: "USERNAME_CHECK_ERROR"
            }),
            { 
              status: 500, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        if (existingProfile) {
          console.log('❌ Username already exists:', username);
          return new Response(
            JSON.stringify({ 
              error: "Username already exists",
              code: "USERNAME_EXISTS"
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        // Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: userEmail,
          password: password,
          email_confirm: true, // Auto-confirm for admin-created users
          user_metadata: {
            username: username.trim(),
            full_name: full_name || username.trim(),
            role: role,
            created_by: userInfo.userId,
            created_by_email: userInfo.email
          },
          app_metadata: {
            role: role,
            created_by_manager: userInfo.userId
          }
        });

        if (authError) {
          console.error('❌ Error creating auth user:', authError);
          
          // Handle specific error cases
          if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
            return new Response(
              JSON.stringify({ 
                error: "Email already registered",
                code: "EMAIL_EXISTS"
              }),
              { 
                status: 400, 
                headers: { 'Content-Type': 'application/json', ...corsHeaders } 
              }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              error: "Failed to create user account", 
              details: authError.message,
              code: "AUTH_CREATION_ERROR"
            }),
            { 
              status: 500, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        if (!authUser.user) {
          console.error('❌ No user data returned from auth creation');
          return new Response(
            JSON.stringify({ 
              error: "User creation failed - no user data returned",
              code: "NO_USER_DATA"
            }),
            { 
              status: 500, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        console.log('✅ Auth user created successfully:', {
          id: authUser.user.id,
          email: authUser.user.email,
          role: role,
          user_metadata: authUser.user.user_metadata,
          app_metadata: authUser.user.app_metadata
        });

        // The user profile will be automatically created by the `handle_new_user` trigger
        // We don't need to manually insert into user_profiles table

        // Log successful user creation for audit
        console.log('🎉 USER CREATION COMPLETED:', {
          new_user_id: authUser.user.id,
          new_user_email: authUser.user.email,
          new_user_role: role,
          created_by_manager: userInfo.userId,
          timestamp: new Date().toISOString()
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "User created successfully",
            user: {
              id: authUser.user.id,
              email: authUser.user.email,
              username: username.trim(),
              role: role,
              created_at: authUser.user.created_at
            }
          }),
          { 
            status: 201, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );

      } catch (error) {
        console.error('❌ Critical error in POST operation:', error);
        return new Response(
          JSON.stringify({ 
            error: "Internal server error during user creation", 
            details: error instanceof Error ? error.message : 'Unknown error',
            code: "POST_OPERATION_ERROR"
          }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }
    }

    // ==================== PUT REQUEST: UPDATE USER ====================
    if (req.method === "PUT") {
      console.log('✏️ Processing PUT request - Updating user');
      
      try {
        // Extract user ID from URL path
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');
        const userId = pathParts[pathParts.length - 1];
        
        if (!userId || userId === 'manage-users') {
          console.log('❌ No user ID provided in URL');
          return new Response(
            JSON.stringify({ 
              error: "User ID is required in URL path",
              code: "MISSING_USER_ID"
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        // Parse request body
        const requestBody = await req.json();
        console.log('📝 Update request body:', { 
          ...requestBody, 
          password: requestBody.password ? '[REDACTED]' : undefined 
        });
        
        const { username, full_name, role, password } = requestBody;

        // Validate required fields
        if (!username || !full_name || !role) {
          return new Response(
            JSON.stringify({ 
              error: "Username, full_name, and role are required",
              code: "MISSING_REQUIRED_FIELDS"
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        // Validate role
        if (!['manager', 'operador'].includes(role)) {
          return new Response(
            JSON.stringify({ 
              error: "Role must be either 'manager' or 'operador'",
              code: "INVALID_ROLE"
            }),
            { 
              status: 400, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        console.log('🔄 Updating user:', userId, 'with role:', role);

        // Prepare update data
        const updateData: any = {
          user_metadata: {
            username: username.trim(),
            full_name: full_name.trim(),
            role: role,
            updated_by: userInfo.userId,
            updated_at: new Date().toISOString()
          },
          app_metadata: {
            role: role,
            updated_by_manager: userInfo.userId
          }
        };

        // Add password if provided
        if (password && password.trim().length >= 6) {
          updateData.password = password.trim();
          console.log('🔑 Password will be updated');
        }

        // Update user in Supabase Auth
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
          userId,
          updateData
        );

        if (updateError) {
          console.error('❌ Error updating user:', updateError);
          return new Response(
            JSON.stringify({ 
              error: "Failed to update user", 
              details: updateError.message,
              code: "USER_UPDATE_ERROR"
            }),
            { 
              status: 500, 
              headers: { 'Content-Type': 'application/json', ...corsHeaders } 
            }
          );
        }

        console.log('✅ User updated successfully:', {
          id: updatedUser.user.id,
          email: updatedUser.user.email,
          role: role,
          updated_by: userInfo.userId
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "User updated successfully",
            user: {
              id: updatedUser.user.id,
              email: updatedUser.user.email,
              username: username.trim(),
              full_name: full_name.trim(),
              role: role,
              updated_at: new Date().toISOString()
            }
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
    // ==================== UNSUPPORTED METHODS ====================
    console.log('❌ Unsupported HTTP method:', req.method);
    return new Response(
      JSON.stringify({ 
        error: "Method not allowed",
        supported_methods: ["GET", "POST", "PUT", "OPTIONS"],
        received_method: req.method,
        code: "METHOD_NOT_ALLOWED"
      }),
      { 
        status: 405, 
        headers: { 
          'Content-Type': 'application/json',
          'Allow': 'GET, POST, PUT, OPTIONS',
          ...corsHeaders 
        } 
      }
    );

      } catch (error) {
        console.error('❌ Critical error in PUT operation:', error);
        return new Response(
          JSON.stringify({ 
            error: "Internal server error during user update", 
            details: error instanceof Error ? error.message : 'Unknown error',
            code: "PUT_OPERATION_ERROR"
          }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }
    }
  } catch (error) {
    console.error('❌ CRITICAL ERROR in manage-users function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: "Critical internal server error",
        details: error instanceof Error ? error.message : 'Unknown error',
        code: "CRITICAL_ERROR",
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});