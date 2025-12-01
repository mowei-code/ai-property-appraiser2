
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

  // 1. Session User Handler - 完全容錯版
  // 即使資料庫 (public.profiles) 壞掉，也要保證能從 Auth Session 登入
  const handleSessionUser = useCallback(async (sessionUser: any) => {
      if (!isSupabaseConfigured || !sessionUser) return;

      // 預設使用者物件 (Fallback)
      const fallbackUser: User = {
          id: sessionUser.id,
          email: sessionUser.email || '',
          role: sessionUser.email?.toLowerCase() === SYSTEM_ADMIN_EMAIL.toLowerCase() ? '管理員' : '一般用戶',
          name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'User',
          phone: sessionUser.user_metadata?.phone || '',
          subscriptionExpiry: null
      };

      try {
          // 嘗試從資料庫抓取完整資料
          const { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionUser.id)
              .maybeSingle();

          if (error) {
              console.warn("[Auth] DB Fetch Error (Ignored):", error.message);
              // 資料庫讀取失敗，直接使用 Fallback，不丟出錯誤
              setCurrentUser(fallbackUser);
              
              // 嘗試在背景修復 (不等待)
              const newProfileData = {
                  id: sessionUser.id,
                  email: sessionUser.email,
                  name: sessionUser.user_metadata?.name || 'User',
                  role: fallbackUser.role,
                  updated_at: new Date().toISOString()
              };
              supabase.from('profiles').upsert([newProfileData], { onConflict: 'id' }).then(({ error: upsertErr }) => {
                  if (upsertErr) console.warn("[Auth] Background heal failed:", upsertErr.message);
              });
              
              return;
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
              // 有 Auth 但沒 Profile -> 使用 Fallback 並嘗試建立
              setCurrentUser(fallbackUser);
              const newProfileData = {
                  id: sessionUser.id,
                  email: sessionUser.email,
                  name: sessionUser.user_metadata?.name || 'User',
                  role: fallbackUser.role,
                  updated_at: new Date().toISOString()
              };
              await supabase.from('profiles').upsert([newProfileData], { onConflict: 'id' });
          }
      } catch (e) {
          console.error("[Auth] Critical Error (Handled):", e);
          // 發生任何未知錯誤，最後一道防線：讓使用者登入
          setCurrentUser(fallbackUser);
      }
  }, []);

  // 2. Fetch Users (Admin Only)
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
        // 1. 嘗試註冊
        const { data, error: signUpError } = await supabase.auth.signUp({
            email: details.email,
            password: details.password,
            options: { 
                data: { name: details.name, phone: details.phone } 
            }
        });

        // 2. 處理錯誤
        if (signUpError) {
            // 如果顯示「已註冊」，這是正常的，提示用戶登入
            if (signUpError.message.includes("already registered") || signUpError.status === 422) {
                 return { success: false, messageKey: 'registrationFailed', message: '此 Email 已註冊，請直接登入。' };
            }
            
            // 重要：如果是 "Database error" (Trigger 錯誤)，我們忽略它！
            // 只要 User 建立了，我們就能登入。
            if (signUpError.message.includes("Database error")) {
                console.warn("Ignoring DB Trigger error during signup:", signUpError.message);
                // 嘗試直接登入看看
                const loginResult = await login(details.email, details.password);
                if (loginResult.success) {
                    return { success: true, messageKey: 'registrationSuccess', message: '註冊成功 (系統已自動修復)' };
                }
            }

            return { success: false, messageKey: 'registrationFailed', errorDetail: signUpError.message };
        }

        // 3. 註冊成功 (或需要驗證信)
        if (data.user) {
            // 自動登入
            await handleSessionUser(data.user);
            setLoginModalOpen(false);
            return { success: true, messageKey: 'registrationSuccess' };
        }
        
        // 理論上不該到這裡，除非開啟了 Email 確認
        return { success: false, messageKey: 'registrationFailed', message: '請檢查信箱驗證信' };

    } catch (error: any) {
        console.error("Register Exception:", error);
        return { success: false, messageKey: 'registrationFailed', errorDetail: error.message };
    }
  };

  const addUser = async (details: { email: string; password: string; role: UserRole; name: string; phone: string }): Promise<AuthResult> => {
      // 簡化版 Add User (Admin Only)
      // 這裡不實作完整的 Admin Create User 因為 Supabase Client SDK 不支援直接建立帶密碼的用戶而不發信
      // 建議只用前端註冊流程
      return { success: false, messageKey: 'registrationFailed', message: '請使用前端註冊功能' };
  };

  const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };

      try {
          const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
          if (!targetUser) return { success: false, messageKey: 'userNotFound' };

          const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
          delete dbUpdates.id; 
          delete dbUpdates.email; 
          delete dbUpdates.password; 

          const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', targetUser.id);
          
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
