
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

  // 標準流程：取得使用者 Profile
  const fetchProfile = useCallback(async (sessionUser: any) => {
      if (!sessionUser) return;

      try {
          // 1. 嘗試從 profiles 資料表讀取
          const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionUser.id)
              .single();

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
              // 2. 若無 Profile (可能是 Trigger 未觸發)，嘗試手動補建 (最基本的防呆，不報錯)
              const newProfile = {
                  id: sessionUser.id,
                  email: sessionUser.email,
                  name: sessionUser.user_metadata?.name || '',
                  role: sessionUser.email === SYSTEM_ADMIN_EMAIL ? '管理員' : '一般用戶',
                  updated_at: new Date().toISOString()
              };
              
              // 嘗試寫入，若失敗則僅在 Console 顯示，不阻擋用戶使用基本功能
              const { error: insertError } = await supabase.from('profiles').upsert([newProfile]);
              
              if (!insertError) {
                  setCurrentUser({ ...newProfile, role: newProfile.role as UserRole });
              } else {
                  console.warn("Profile creation failed (silent fallback):", insertError);
                  // 降級模式：使用 Session 資訊建立暫時 User 物件
                  setCurrentUser({
                      id: sessionUser.id,
                      email: sessionUser.email,
                      role: '一般用戶',
                      name: sessionUser.user_metadata?.name
                  });
              }
          }
      } catch (e) {
          console.error("Error in fetchProfile:", e);
      }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!isSupabaseConfigured || !currentUser || currentUser.role !== '管理員') return;
    try {
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
    } catch(e) { console.error("Admin fetch users failed", e); }
  }, [currentUser]);

  useEffect(() => {
    const initAuth = async () => {
        if (isSupabaseConfigured) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await fetchProfile(session.user);
            }
        }
    };
    initAuth();
  }, [fetchProfile]);

  useEffect(() => {
      if (!isSupabaseConfigured) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
              setCurrentUser(null);
              setUsers([]);
              setAdminPanelOpen(false);
          } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
               await fetchProfile(session.user);
          }
      });
      return () => { subscription.unsubscribe(); };
  }, [fetchProfile]);

  useEffect(() => {
      if (currentUser?.role === '管理員') fetchUsers();
  }, [currentUser, fetchUsers]);

  const forceReconnect = async () => { window.location.reload(); };

  const login = async (emailInput: string, passInput: string): Promise<AuthResult> => {
    const email = emailInput.trim();
    const pass = passInput.trim();
    if (!isSupabaseConfigured) return { success: false, messageKey: 'loginFailed', message: '未設定 Supabase 連線' };

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) return { success: false, messageKey: 'loginFailed', message: error.message };
        
        if (data.user) {
            await fetchProfile(data.user);
            setLoginModalOpen(false);
            return { success: true, messageKey: 'loginSuccess' };
        }
        return { success: false, messageKey: 'loginFailed', message: 'Unknown error' };
    } catch (e: any) {
        return { success: false, messageKey: 'loginFailed', message: e.message };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setCurrentUser(null);
    setUsers([]);
    setAdminPanelOpen(false);
  };

  const register = async (details: { email: string; password: string; name: string; phone: string; }): Promise<AuthResult> => {
    if (!isSupabaseConfigured) return { success: false, messageKey: 'registrationFailed', message: '未設定 Supabase 連線' };

    try {
        const { data, error } = await supabase.auth.signUp({
            email: details.email,
            password: details.password,
            options: { data: { name: details.name, phone: details.phone } }
        });

        if (error) {
            return { success: false, messageKey: 'registrationFailed', message: error.message };
        }

        if (data.user) {
            await fetchProfile(data.user);
            setLoginModalOpen(false);
            return { success: true, messageKey: 'registrationSuccess' };
        }
        
        return { success: false, messageKey: 'registrationFailed', message: '請檢查信箱驗證信' };

    } catch (error: any) {
        return { success: false, messageKey: 'registrationFailed', errorDetail: error.message };
    }
  };

  const addUser = async (details: { email: string; password: string; role: UserRole; name: string; phone: string }): Promise<AuthResult> => {
      // 簡單實作：純粹回傳提示，請使用前端註冊功能
      return { success: false, messageKey: 'registrationFailed', message: '請使用前端註冊功能' };
  };

  const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };
      try {
          const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', email).single();
          if (!targetUser) return { success: false, messageKey: 'userNotFound' };

          const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
          delete dbUpdates.id; 
          delete dbUpdates.email; 
          delete dbUpdates.password; 

          const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', targetUser.id);
          if (error) throw error;

          await fetchUsers();
          if (currentUser?.email === email) {
              setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
          }
          return { success: true, messageKey: 'updateUserSuccess' };
      } catch (e: any) {
          return { success: false, messageKey: 'updateUserSuccess', message: e.message };
      }
  };

  const deleteUser = async (email: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };
      try {
          const { error } = await supabase.from('profiles').delete().eq('email', email);
          if (error) throw error;
          await fetchUsers();
          return { success: true, messageKey: 'deleteUserSuccess', message: '資料已清除' };
      } catch (e: any) {
          return { success: false, messageKey: 'deleteUserSuccess', message: e.message };
      }
  };

  return (
    <AuthContext.Provider value={{
      currentUser, users, login, logout, register,
      isLoginModalOpen, setLoginModalOpen,
      isAdminPanelOpen, setAdminPanelOpen,
      addUser, updateUser, deleteUser,
      refreshUsers: fetchUsers, forceReconnect
    }}>
      {children}
    </AuthContext.Provider>
  );
};
