
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

  // --- Helpers ---

  const handleSessionUser = useCallback(async (sessionUser: any) => {
      if (!isSupabaseConfigured) return;

      try {
          // 1. Fetch profile from DB
          let { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionUser.id)
              .maybeSingle();

          // 2. Recovery: If Admin logs in but has no profile (DB reset), recreate it.
          if (!profile && sessionUser.email === SYSTEM_ADMIN_EMAIL) {
              const newProfile = {
                  id: sessionUser.id,
                  email: sessionUser.email,
                  name: 'System Admin',
                  phone: '0900000000',
                  role: '管理員',
                  updated_at: new Date().toISOString()
              };
              const { error: insertError } = await supabase.from('profiles').upsert([newProfile]);
              if (!insertError) profile = newProfile;
          }

          // 3. Set State
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
              // Fallback if profile missing (should rarely happen for regular users)
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
    const email = emailInput.trim().toLowerCase();
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
    setCurrentUser(null);
    setUsers([]);
    if (isSupabaseConfigured) {
        await supabase.auth.signOut();
    }
    setAdminPanelOpen(false);
  };

  const register = async (details: { email: string; password: string; name: string; phone: string; }): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { success: false, messageKey: 'registrationFailed', message: '未設定 Supabase 連線' };

    try {
        // 1. Strict Auth Registration First
        const { data, error: signUpError } = await supabase.auth.signUp({
            email: details.email,
            password: details.password,
            options: { data: { name: details.name, phone: details.phone } }
        });

        if (signUpError) {
            return { success: false, messageKey: 'registrationFailed', errorDetail: signUpError.message };
        }

        if (data.user) {
            // 2. Insert Profile (Only if Auth success)
            // Use the ID from Auth to ensure linkage
            const { error: profileError } = await supabase.from('profiles').insert([{
                id: data.user.id, // CRITICAL: Must match Auth ID
                email: details.email,
                name: details.name,
                phone: details.phone,
                role: details.email === SYSTEM_ADMIN_EMAIL ? '管理員' : '一般用戶',
                updated_at: new Date().toISOString(),
            }]);

            if (profileError) {
                console.error("Profile creation failed:", profileError);
                // We don't rollback Auth here, but we log it. User can likely login and trigger recovery later.
            }
            
            await handleSessionUser(data.user);
            setLoginModalOpen(false);
            return { success: true, messageKey: 'registrationSuccess' };
        }
        return { success: false, messageKey: 'registrationFailed', message: 'No user data returned' };
    } catch (error: any) {
        return { success: false, messageKey: 'registrationFailed', errorDetail: error.message };
    }
  };

  const addUser = async (details: { email: string; password: string; role: UserRole; name: string; phone: string }): Promise<AuthResult> => {
      // Client-side cannot create users for others without Service Role.
      return { success: false, messageKey: 'registrationFailed', message: '請使用公開註冊頁面或 Supabase Dashboard 新增用戶' };
  };

  const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };

      try {
          const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
          if (!targetUser) return { success: false, messageKey: 'userNotFound' };

          const dbUpdates: any = { updated_at: new Date().toISOString(), ...updates };
          delete dbUpdates.id; 
          delete dbUpdates.email; 
          delete dbUpdates.password; 

          const { error } = await supabase
              .from('profiles')
              .update(dbUpdates)
              .eq('id', targetUser.id);
          
          if (error) throw error;

          await fetchUsers();
          
          // Update current user state if self
          if (currentUser?.email === email) {
              setCurrentUser({ ...currentUser, ...updates });
          }

          return { success: true, messageKey: 'userUpdated' };
      } catch (e: any) {
          return { success: false, messageKey: 'userUpdated', message: e.message };
      }
  };

  const deleteUser = async (email: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };
      
      try {
          // Note: This only deletes the Profile. To delete Auth user, you need Supabase Admin API (server-side).
          const { error } = await supabase.from('profiles').delete().eq('email', email);
          if (error) throw error;
          
          await fetchUsers();
          return { success: true, messageKey: 'userDeleted', message: '會員資料已刪除 (Auth帳號需至Supabase後台移除)' };
      } catch (e: any) {
          return { success: false, messageKey: 'userDeleted', message: e.message };
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
