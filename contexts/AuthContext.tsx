
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

// 僅用於初始化新用戶時判斷預設權限，不影響已存在的資料庫紀錄
const SYSTEM_ADMIN_EMAIL = 'admin@mazylab.com';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isAdminPanelOpen, setAdminPanelOpen] = useState(false);

  // 從資料庫同步使用者 Profile
  const fetchProfile = useCallback(async (sessionUser: any) => {
      if (!sessionUser) return;

      try {
          // 1. 嘗試從資料庫讀取現有 Profile
          const { data: existingProfile, error: fetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sessionUser.id)
              .maybeSingle();

          if (fetchError) {
              console.error("[Auth] Database fetch error:", fetchError.message);
              // 如果是連線錯誤，不進行後續寫入，避免資料錯亂
              return;
          }

          if (existingProfile) {
              // 2. 資料已存在，直接使用資料庫中的權限與資料
              setCurrentUser({
                  id: existingProfile.id,
                  email: existingProfile.email,
                  role: existingProfile.role as UserRole,
                  name: existingProfile.name,
                  phone: existingProfile.phone,
                  subscriptionExpiry: existingProfile.subscription_expiry
              });
          } else {
              // 3. 資料庫無此 Profile（新註冊），執行初始化寫入
              console.log("[Auth] Profile not found, creating new profile...");
              
              // 僅在「建立」時判斷是否為預設管理員
              const isSystemAdmin = sessionUser.email === SYSTEM_ADMIN_EMAIL;
              
              const newProfile = {
                  id: sessionUser.id,
                  email: sessionUser.email,
                  role: isSystemAdmin ? '管理員' : '一般用戶', 
                  name: sessionUser.user_metadata?.name || '',
                  phone: sessionUser.user_metadata?.phone || '',
                  updated_at: new Date().toISOString()
              };

              const { error: insertError } = await supabase.from('profiles').upsert([newProfile]);
              
              if (insertError) {
                  throw insertError;
              }

              // 寫入成功後更新本地狀態
              setCurrentUser({
                  id: newProfile.id,
                  email: newProfile.email,
                  role: newProfile.role as UserRole,
                  name: newProfile.name,
                  phone: newProfile.phone,
                  subscriptionExpiry: null
              });
          }
      } catch (e: any) {
          console.error("[Auth] Critical Profile Error:", e.message);
          // 發生嚴重錯誤時，僅提供最基礎的 Session 資訊顯示，權限降級為一般用戶以策安全
          setCurrentUser({
              id: sessionUser.id,
              email: sessionUser.email,
              role: '一般用戶',
              name: sessionUser.user_metadata?.name || '',
              phone: sessionUser.user_metadata?.phone || ''
          });
      }
  }, []);

  const fetchUsers = useCallback(async () => {
    // 嚴格檢查：只有「目前登入者」在狀態中確認為「管理員」時才去撈取列表
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

  // 當使用者狀態改變且為管理員時，自動更新用戶列表
  useEffect(() => {
      if (currentUser?.role === '管理員') {
          fetchUsers();
      } else {
          setUsers([]); // 非管理員清空列表
      }
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
            // 嘗試建立 Profile，如果這裡失敗 (例如 email 未驗證導致 RLS 擋住)，
            // 用戶之後登入時 fetchProfile 也會補建
            try {
                await fetchProfile(data.user);
            } catch(e) {
                console.warn("Initial profile creation warning:", e);
            }
            
            setLoginModalOpen(false);
            return { success: true, messageKey: 'registrationSuccess' };
        }
        
        return { success: false, messageKey: 'registrationFailed', message: '請檢查信箱驗證信' };

    } catch (error: any) {
        return { success: false, messageKey: 'registrationFailed', errorDetail: error.message };
    }
  };

  const addUser = async (details: { email: string; password: string; role: UserRole; name: string; phone: string }): Promise<AuthResult> => {
      // 提醒：在 Supabase Client 端直接建立其他用戶是受限的，除非使用 Server Role Key。
      // 這裡僅回傳提示，引導使用標準註冊流程。
      return { success: false, messageKey: 'registrationFailed', message: '請登出後使用註冊功能建立新帳號' };
  };

  const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };
      try {
          // 1. 獲取目標 User ID
          const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
          
          if (!targetUser) {
              return { success: false, messageKey: 'userNotFound' };
          }

          // 2. 準備更新資料
          const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
          // 移除不應該寫入 DB 的欄位
          delete dbUpdates.id; 
          delete dbUpdates.email; 
          delete dbUpdates.password; 

          // 3. 執行更新
          const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', targetUser.id);
          if (error) throw error;

          // 4. 若更新的是自己，同步更新本地狀態，UI 才會即時反應 (例如購買後變付費用戶)
          if (currentUser?.email === email) {
              setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
          }
          
          // 5. 重新撈取列表 (若為管理員)
          if (currentUser?.role === '管理員') {
              await fetchUsers();
          }
          
          return { success: true, messageKey: 'updateUserSuccess' };
      } catch (e: any) {
          return { success: false, messageKey: 'updateUserSuccess', message: e.message };
      }
  };

  const deleteUser = async (email: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };
      try {
          // 僅刪除 profiles 表中的資料
          const { error } = await supabase.from('profiles').delete().eq('email', email);
          if (error) throw error;
          
          await fetchUsers();
          return { success: true, messageKey: 'deleteUserSuccess', message: '資料已清除 (Auth 帳號需至 Supabase 後台刪除)' };
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
