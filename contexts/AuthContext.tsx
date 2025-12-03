
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

      // *** 超級管理員強制後門 ***
      // 如果登入的是 admin，無論資料庫發生什麼錯誤 (Schema error, Network error)，
      // 都強制給予管理員權限，確保能進入系統修復。
      if (sessionUser.email === SYSTEM_ADMIN_EMAIL) {
          console.log("Admin login detected - activating resilient mode.");
          setCurrentUser({
              id: sessionUser.id,
              email: sessionUser.email,
              role: '管理員',
              name: sessionUser.user_metadata?.name || 'Admin',
              phone: sessionUser.user_metadata?.phone || '',
              subscriptionExpiry: null // Admin never expires
          });
          
          // 雖然已經強制登入，但我們還是在背景嘗試同步資料庫，不讓錯誤阻擋 UI
          try {
             const { data } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle();
             if (!data) {
                 // 自動補建 Admin Profile
                 await supabase.from('profiles').upsert([{
                     id: sessionUser.id,
                     email: sessionUser.email,
                     role: '管理員',
                     name: 'Admin',
                     updated_at: new Date().toISOString()
                 }]);
             }
          } catch (e) {
              console.warn("Background admin profile sync failed (non-fatal):", e);
          }
          return;
      }

      // 一般用戶流程
      try {
          const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionUser.id)
              .maybeSingle();

          if (error) throw error;

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
              // 若無 Profile，嘗試補建
              const newProfile = {
                  id: sessionUser.id,
                  email: sessionUser.email,
                  name: sessionUser.user_metadata?.name || '',
                  role: '一般用戶',
                  phone: sessionUser.user_metadata?.phone || '',
                  updated_at: new Date().toISOString()
              };
              
              const { error: insertError } = await supabase.from('profiles').upsert([newProfile]);
              
              if (!insertError) {
                  setCurrentUser({ ...newProfile, role: '一般用戶' as UserRole });
              } else {
                  // 降級模式：使用 Session 資訊
                  console.warn("Profile creation failed, falling back to session:", insertError);
                  setCurrentUser({
                      id: sessionUser.id,
                      email: sessionUser.email,
                      role: '一般用戶',
                      name: sessionUser.user_metadata?.name,
                      phone: sessionUser.user_metadata?.phone
                  });
              }
          }
      } catch (e: any) {
          console.error("Critical Auth Error:", e.message);
          // 發生嚴重資料庫錯誤時，允許用戶以「一般用戶」身分登入，避免卡死
          setCurrentUser({
              id: sessionUser.id,
              email: sessionUser.email,
              role: '一般用戶',
              name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0],
              phone: sessionUser.user_metadata?.phone
          });
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
            // 嘗試立即建立 Profile，如果失敗也沒關係，fetchProfile 會處理
            try {
                await fetchProfile(data.user);
            } catch(ignore) {}
            
            setLoginModalOpen(false);
            return { success: true, messageKey: 'registrationSuccess' };
        }
        
        return { success: false, messageKey: 'registrationFailed', message: '請檢查信箱驗證信' };

    } catch (error: any) {
        return { success: false, messageKey: 'registrationFailed', errorDetail: error.message };
    }
  };

  const addUser = async (details: { email: string; password: string; role: UserRole; name: string; phone: string }): Promise<AuthResult> => {
      return { success: false, messageKey: 'registrationFailed', message: '請使用前端註冊功能' };
  };

  const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };
      try {
          // 這裡使用 maybeSingle 避免報錯
          const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
          
          if (!targetUser) {
              // 如果資料庫真的沒這個人 (例如 fallback 模式)，嘗試更新本地狀態讓 UI 有反應
              if (currentUser?.email === email) {
                  setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
                  return { success: true, messageKey: 'updateUserSuccess', message: '僅更新本地狀態 (資料庫未連線)' };
              }
              return { success: false, messageKey: 'userNotFound' };
          }

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
