
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
          // 使用 maybeSingle() 避免無資料時報錯，並捕捉所有資料庫錯誤
          const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionUser.id)
              .maybeSingle();

          // 如果有嚴重錯誤 (例如 table 不存在)，拋出異常進入 catch 區塊
          if (error) {
              console.warn("Database error (non-fatal):", error.message);
              throw error; 
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
              // 2. 若無 Profile，嘗試寫入 (自動修復)
              const newProfile = {
                  id: sessionUser.id,
                  email: sessionUser.email,
                  name: sessionUser.user_metadata?.name || '',
                  role: sessionUser.email === SYSTEM_ADMIN_EMAIL ? '管理員' : '一般用戶',
                  phone: sessionUser.user_metadata?.phone || '',
                  updated_at: new Date().toISOString()
              };
              
              // 嘗試寫入，若失敗則僅在 Console 顯示，不阻擋用戶
              const { error: insertError } = await supabase.from('profiles').upsert([newProfile]);
              
              if (!insertError) {
                  setCurrentUser({ ...newProfile, role: newProfile.role as UserRole });
              } else {
                  console.warn("Profile creation failed (silent fallback):", insertError);
                  // 降級模式：使用 Session 資訊建立暫時 User 物件
                  throw new Error("Fallback to session");
              }
          }
      } catch (e) {
          // *** 最終防呆機制 ***
          // 無論資料庫發生什麼事 (Table 不存在、權限錯誤、連線失敗)
          // 都強制允許使用者登入，只使用 Session 中的基本資料
          console.error("Critical Auth Warning (Fallback active):", e);
          
          setCurrentUser({
              id: sessionUser.id,
              email: sessionUser.email,
              role: sessionUser.email === SYSTEM_ADMIN_EMAIL ? '管理員' : '一般用戶',
              name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0],
              phone: sessionUser.user_metadata?.phone || ''
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
