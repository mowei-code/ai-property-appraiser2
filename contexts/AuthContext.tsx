
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type { User, UserRole } from '../types';

interface AuthResult {
  success: boolean;
  messageKey: string;
  message?: string;
  errorDetail?: string;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (email: string, pass: string) => Promise<AuthResult>;
  logout: () => void;
  register: (details: { email: string; password: string; name: string; phone: string; }) => Promise<AuthResult>;
  isLoginModalOpen: boolean;
  setLoginModalOpen: (isOpen: boolean) => void;
  isAdminPanelOpen: boolean;
  setAdminPanelOpen: (isOpen: boolean) => void;
  addUser: (details: { email: string; password: string; role: UserRole; name: string; phone: string }) => Promise<AuthResult>;
  updateUser: (email: string, updates: Partial<User>) => Promise<AuthResult>;
  deleteUser: (email: string) => Promise<AuthResult>;
  refreshUsers: () => Promise<void>;
  forceReconnect: () => void;
}

export const AuthContext = createContext<AuthContextType>(null!);

const SYSTEM_ADMIN_EMAIL = 'admin@mazylab.com';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isAdminPanelOpen, setAdminPanelOpen] = useState(false);

  // 1. Session User Handler - Syncs Auth state with DB Profile (Self-Healing)
  const handleSessionUser = useCallback(async (sessionUser: any) => {
      if (!isSupabaseConfigured) return;

      try {
          // Fetch profile from public.profiles
          let profile = null;
          try {
              const { data, error } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', sessionUser.id)
                  .maybeSingle();
              if (!error) profile = data;
          } catch(e) {
              console.warn("Error fetching profile, attempting heal...", e);
          }

          // Self-Healing: If Auth exists but Profile is missing, create it automatically.
          if (!profile) {
              console.log("[Auth] Profile missing for existing Auth user. Auto-healing...");
              const isAdmin = sessionUser.email?.toLowerCase() === SYSTEM_ADMIN_EMAIL.toLowerCase();
              const newProfileData = {
                  id: sessionUser.id,
                  email: sessionUser.email,
                  name: sessionUser.user_metadata?.name || 'User',
                  role: isAdmin ? '管理員' : '一般用戶',
                  updated_at: new Date().toISOString()
              };
              
              // Use upsert instead of insert to handle race conditions or zombie data better
              // We intentionally ignore errors here to allow fallback to memory user
              try {
                  const { error: insertError } = await supabase.from('profiles').upsert([newProfileData], { onConflict: 'id' });
                  if (!insertError) {
                      profile = newProfileData;
                  } else {
                      console.error("[Auth] Auto-healing failed (non-fatal):", insertError);
                  }
              } catch(e) {
                  console.error("Auto-healing exception", e);
              }
          }

          if (profile) {
              setCurrentUser({
                  id: profile.id,
                  email: profile.email,
                  role: profile.role as UserRole,
                  name: profile.name,
                  phone: profile.phone,
                  subscriptionExpiry: profile.subscription_expiry
              });
          } else {
              // Fallback if healing failed (This allows login even if DB is broken)
              setCurrentUser({
                  id: sessionUser.id,
                  email: sessionUser.email!,
                  role: '一般用戶',
                  name: sessionUser.user_metadata?.name || '',
                  phone: sessionUser.user_metadata?.phone || ''
              });
          }
      } catch (e) {
          console.error("[Auth] Session handling error:", e);
      }
  }, []);

  // 2. Fetch Users (Admin Only)
  const fetchUsers = useCallback(async () => {
    if (!isSupabaseConfigured || !currentUser || currentUser.role !== '管理員') return;

    const { data, error } = await supabase.from('profiles').select('*');
    if (!error && data) {
        const mappedUsers: User[] = data.map((u: any) => ({
            id: u.id,
            email: u.email,
            role: u.role as UserRole,
            name: u.name,
            phone: u.phone,
            subscriptionExpiry: u.subscription_expiry,
        })).sort((a, b) => new Date(b.subscriptionExpiry || 0).getTime() - new Date(a.subscriptionExpiry || 0).getTime());
        
        setUsers(mappedUsers);
    }
  }, [currentUser]);

  // --- Effects ---

  useEffect(() => {
    const initAuth = async () => {
        if (isSupabaseConfigured) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await handleSessionUser(session.user);
            }
        }
    };
    initAuth();
  }, [handleSessionUser]);

  useEffect(() => {
      if (!isSupabaseConfigured) return;

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
              setCurrentUser(null);
              setUsers([]);
              setAdminPanelOpen(false);
          } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
               await handleSessionUser(session.user);
          }
      });

      return () => {
          subscription.unsubscribe();
      };
  }, [handleSessionUser]);

  useEffect(() => {
      if (currentUser?.role === '管理員') {
          fetchUsers();
      }
  }, [currentUser, fetchUsers]);

  // --- Actions ---

  const forceReconnect = async () => {
      window.location.reload();
  };

  const login = async (emailInput: string, passInput: string): Promise<AuthResult> => {
    const email = emailInput.trim();
    const pass = passInput.trim();

    if (!isSupabaseConfigured) return { success: false, messageKey: 'loginFailed', message: '未設定 Supabase 連線' };

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) return { success: false, messageKey: 'loginFailed', message: error.message };
        
        if (data.user) {
            await handleSessionUser(data.user);
            setLoginModalOpen(false);
            return { success: true, messageKey: 'loginSuccess' };
        }
        return { success: false, messageKey: 'loginFailed', message: 'Unknown login error' };
    } catch (e: any) {
        return { success: false, messageKey: 'loginFailed', message: e.message };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
        await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setUsers([]);
    setAdminPanelOpen(false);
  };

  const register = async (details: { email: string; password: string; name: string; phone: string; }): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { success: false, messageKey: 'registrationFailed', message: '未設定 Supabase 連線' };

    try {
        // SKIP the "Check if user exists in Profile" step entirely.
        // This is what causes the "Database error finding user" loop if the table is broken.
        // We let Supabase Auth handle the uniqueness check.

        // 2. Attempt Auth Registration
        const { data, error: signUpError } = await supabase.auth.signUp({
            email: details.email,
            password: details.password,
            options: { 
                data: { name: details.name, phone: details.phone } 
            }
        });

        if (signUpError) {
            // Check if user is already registered in Auth
            if (signUpError.message.includes("already registered") || signUpError.status === 422) {
                 return { success: false, messageKey: 'registrationFailed', message: '此 Email 已註冊，請直接登入。' };
            }
            return { success: false, messageKey: 'registrationFailed', errorDetail: signUpError.message };
        }

        if (data.user) {
            const targetEmail = details.email.toLowerCase();
            // Trigger created the profile automatically via SQL, but we sync roles just in case
            const isAdmin = targetEmail === SYSTEM_ADMIN_EMAIL.toLowerCase();
            if (isAdmin) {
                 // Try to set admin, ignore errors if DB broken
                 try { await supabase.from('profiles').update({ role: '管理員' }).eq('id', data.user.id); } catch(e) {}
            }
            
            // Auto login state
            await handleSessionUser(data.user);
            setLoginModalOpen(false);
            return { success: true, messageKey: 'registrationSuccess' };
        }
        
        return { success: false, messageKey: 'registrationFailed', message: '請檢查信箱驗證信' };

    } catch (error: any) {
        return { success: false, messageKey: 'registrationFailed', errorDetail: error.message };
    }
  };

  const addUser = async (details: { email: string; password: string; role: UserRole; name: string; phone: string }): Promise<AuthResult> => {
      return { success: false, messageKey: 'registrationFailed', message: '基於安全性，請用戶自行註冊，或至 Supabase 後台操作。' };
  };

  const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };

      try {
          const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
          if (!targetUser) return { success: false, messageKey: 'userNotFound' };

          const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
          // Remove fields that shouldn't be updated via this generic function
          delete dbUpdates.id; 
          delete dbUpdates.email; 
          delete dbUpdates.password; 

          const { error } = await supabase
              .from('profiles')
              .update(dbUpdates)
              .eq('id', targetUser.id);
          
          if (error) throw error;

          await fetchUsers();
          
          if (currentUser?.email === email) {
              setCurrentUser({ ...currentUser, ...updates });
          }

          return { success: true, messageKey: 'updateUserSuccess' };
      } catch (e: any) {
          return { success: false, messageKey: 'updateUserSuccess', message: e.message };
      }
  };

  const deleteUser = async (email: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };
      
      try {
          // SQL has added ON DELETE CASCADE, so deleting from Auth (server-side) would handle it.
          // But client-side SDK cannot delete from Auth directly.
          // We can only delete the Profile, and let the orphaned Auth remain (admin needs to clear from Supabase dashboard).
          // OR, if the user wants to delete themselves...
          
          const { error } = await supabase.from('profiles').delete().eq('email', email);
          if (error) throw error;
          
          await fetchUsers();
          return { success: true, messageKey: 'deleteUserSuccess', message: '會員資料已清除 (注意: Auth 帳號仍需至 Supabase 後台移除以免無法重複註冊)' };
      } catch (e: any) {
          return { success: false, messageKey: 'deleteUserSuccess', message: e.message };
      }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      login,
      logout,
      register,
      isLoginModalOpen,
      setLoginModalOpen,
      isAdminPanelOpen,
      setAdminPanelOpen,
      addUser,
      updateUser,
      deleteUser,
      refreshUsers: fetchUsers,
      forceReconnect
    }}>
      {children}
    </AuthContext.Provider>
  );
};
