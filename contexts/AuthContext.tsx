
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

  // 1. 處理 Session 用戶資料同步
  const handleSessionUser = useCallback(async (sessionUser: any) => {
      if (!isSupabaseConfigured) return;

      try {
          // 從 public.profiles 獲取詳細資料
          let { data: profile, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionUser.id)
              .maybeSingle();

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
              // 如果 Auth 有人但 Profile 沒資料 (罕見情況，通常是註冊中斷)
              // 我們暫時用 Auth 的 metadata 填充，或是視為一般用戶
              console.warn("User has auth session but no profile record.");
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

  // 2. 獲取用戶列表 (僅限管理員)
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
    } else if (error) {
        console.error("Error fetching users:", error);
    }
  }, [currentUser]);

  // --- Effects ---

  // 初始化：檢查 Supabase Session
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

  // 監聽 Auth 狀態變化
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

  // 管理員登入後自動抓取列表
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
    const email = emailInput.trim(); // Do not lowercase password, but email implies lowercase usually. Supabase handles it.
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
        // 1. 註冊 Auth (這是唯一真理)
        const { data, error: signUpError } = await supabase.auth.signUp({
            email: details.email,
            password: details.password,
            options: { 
                data: { name: details.name, phone: details.phone } // 存入 Auth metadata 備用
            }
        });

        if (signUpError) {
            return { success: false, messageKey: 'registrationFailed', errorDetail: signUpError.message };
        }

        if (data.user) {
            // 2. 寫入 Profiles (如果 Auth 成功)
            // 這裡自動判斷：如果 Email 是 admin@mazylab.com，自動給予管理員權限
            const role = details.email.toLowerCase() === SYSTEM_ADMIN_EMAIL.toLowerCase() ? '管理員' : '一般用戶';

            const { error: profileError } = await supabase.from('profiles').insert([{
                id: data.user.id, // 必須與 Auth ID 一致
                email: details.email,
                name: details.name,
                phone: details.phone,
                role: role,
                updated_at: new Date().toISOString(),
            }]);

            if (profileError) {
                console.error("Profile creation failed:", profileError);
                // 這裡是一個潛在的資料不一致點，但因為 Auth 已經成功，用戶可以登入。
                // 理想情況下 Supabase Trigger 會自動建立 profile，但如果我們手動建立失敗，
                // 用戶登入時 handleSessionUser 可能會抓不到 profile。
                // 為了修復，我們可以在 login 時再次檢查並 upsert profile。
                return { success: false, messageKey: 'registrationFailed', errorDetail: '帳號建立成功但個人資料寫入失敗: ' + profileError.message };
            }
            
            // 自動登入狀態
            await handleSessionUser(data.user);
            setLoginModalOpen(false);
            return { success: true, messageKey: 'registrationSuccess' };
        }
        
        // 如果開啟了 Email 確認，data.user 可能為 null 或 session 為 null，視設定而定
        return { success: false, messageKey: 'registrationFailed', message: '請檢查信箱驗證信 (如果已開啟驗證)' };

    } catch (error: any) {
        return { success: false, messageKey: 'registrationFailed', errorDetail: error.message };
    }
  };

  const addUser = async (details: { email: string; password: string; role: UserRole; name: string; phone: string }): Promise<AuthResult> => {
      // 在客戶端無法直接幫別人建立 Auth 帳號 (需要 Service Role)。
      // 這裡僅回傳提示，引導管理員使用 Supabase Dashboard 或邀請連結。
      return { success: false, messageKey: 'registrationFailed', message: '基於安全性，請用戶自行註冊，或至 Supabase 後台新增用戶。' };
  };

  const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };

      try {
          // 先找到該 email 對應的 user id
          const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
          if (!targetUser) return { success: false, messageKey: 'userNotFound' };

          // 準備更新資料 (過濾掉不該更新的欄位)
          const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
          delete dbUpdates.id; 
          delete dbUpdates.email; 
          delete dbUpdates.password; 

          const { error } = await supabase
              .from('profiles')
              .update(dbUpdates)
              .eq('id', targetUser.id);
          
          if (error) throw error;

          await fetchUsers();
          
          // 如果是更新自己，同步更新狀態
          if (currentUser?.email === email) {
              setCurrentUser({ ...currentUser, ...updates });
          }

          return { success: true, messageKey: 'updateUserSuccess' };
      } catch (e: any) {
          return { success: false, messageKey: 'updateUserSuccess', message: '更新失敗: ' + e.message };
      }
  };

  const deleteUser = async (email: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };
      
      try {
          // 注意：Client 端只能刪除 public.profiles 的資料
          // 真正的 Auth User 刪除需要 Supabase Service Role (後端)
          // 這裡我們只做「邏輯刪除」或是刪除 Profile 資料
          const { error } = await supabase.from('profiles').delete().eq('email', email);
          if (error) throw error;
          
          await fetchUsers();
          return { success: true, messageKey: 'deleteUserSuccess', message: '會員資料已清除 (Auth 帳號需至 Supabase 後台移除)' };
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
