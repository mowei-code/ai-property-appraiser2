
import React, { createContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  register: (details: { email: string; password: string; name: string; phone: string; }) => Promise<{ success: boolean; messageKey: string; errorDetail?: string }>;
  addUser: (user: User) => Promise<{ success: boolean; messageKey: string }>;
  updateUser: (email: string, data: Partial<User>) => Promise<{ success: boolean; messageKey: string }>;
  deleteUser: (email: string) => Promise<{ success: boolean; messageKey: string }>;
  refreshUsers: () => Promise<void>;
  isLoginModalOpen: boolean;
  setLoginModalOpen: (isOpen: boolean) => void;
  isAdminPanelOpen: boolean;
  setAdminPanelOpen: (isOpen: boolean) => void;
}

export const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isAdminPanelOpen, setAdminPanelOpen] = useState(false);
  
  const justRegistered = useRef(false);

  // --- Local Storage Helpers (Fallback for when Supabase is NOT configured) ---
  const getLocalUsers = (): User[] => {
    try {
      const stored = localStorage.getItem('app_users');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  };

  const saveLocalUsers = (newUsers: User[]) => {
    localStorage.setItem('app_users', JSON.stringify(newUsers));
    setUsers(newUsers);
  };
  // -----------------------------

  // 使用 useCallback 確保 fetchUsers 可以被依賴引用
  const fetchUsers = useCallback(async () => {
    if (!isSupabaseConfigured) {
        setUsers(getLocalUsers());
        return;
    }
    try {
      // 這裡不使用 timeout 避免不必要的報錯，Supabase client 內部會有處理
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        const profiles = data as any[];
        const mappedUsers: User[] = profiles.map(p => ({
          email: p.email || '',
          role: (p.role || '一般用戶') as UserRole,
          name: p.name || undefined, 
          phone: p.phone || undefined,
          subscriptionExpiry: p.subscription_expiry || undefined
        }));
        setUsers(mappedUsers);
      }
    } catch (error: any) {
      console.warn("fetchUsers warning:", error.message);
    }
  }, []);

  const fetchProfile = async (userId: string) => {
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        return data;
      } catch { return null; }
  };

  // 監聽 Supabase Realtime 變更 (即時更新後台列表)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // 訂閱 profiles 資料表的變更 (新增、修改、刪除)
    const channel = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        console.log('Realtime update detected:', payload);
        fetchUsers(); // 資料庫變動時，重新抓取列表
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUsers]);

  // 初始化 Session
  useEffect(() => {
    const initSession = async () => {
      if (!isSupabaseConfigured) {
          const storedUser = localStorage.getItem('app_current_user');
          if (storedUser) setCurrentUser(JSON.parse(storedUser));
          fetchUsers();
          return;
      }

      try {
        // [防死鎖] 縮短初始化超時時間
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Init timeout')), 2000));
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (profile) {
            const p = profile as any;
            setCurrentUser({
              email: p.email || '',
              role: (p.role || '一般用戶') as UserRole,
              name: p.name || undefined,
              phone: p.phone || undefined,
              subscriptionExpiry: p.subscription_expiry || undefined
            });
          } else {
              const isAdmin = session.user.email === 'admin@mazylab.com';
              setCurrentUser({
                  email: session.user.email || '',
                  role: isAdmin ? '管理員' : '一般用戶'
              });
          }
        }
      } catch (e) {
        console.warn("Session init warning (Supabase might be slow/down):", e);
      }
      fetchUsers();
    };

    initSession();

    if (isSupabaseConfigured) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (justRegistered.current && event === 'SIGNED_IN') return;

          if (session?.user) {
             if (event === 'SIGNED_IN') await new Promise(r => setTimeout(r, 500));
             
             const profile = await fetchProfile(session.user.id);
             if (profile) {
                const p = profile as any;
                setCurrentUser({
                  email: p.email || '',
                  role: (p.role || '一般用戶') as UserRole,
                  name: p.name || undefined,
                  phone: p.phone || undefined,
                  subscriptionExpiry: p.subscription_expiry || undefined
                });
             } else {
                const isAdmin = session.user.email === 'admin@mazylab.com';
                setCurrentUser({
                    email: session.user.email || '',
                    role: isAdmin ? '管理員' : '一般用戶'
                });
             }
             fetchUsers();
          } else if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            setUsers([]);
          }
        });
        return () => subscription.unsubscribe();
    }
  }, [fetchUsers]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    console.log("Login attempt:", email); 

    if (!isSupabaseConfigured) {
        const localUsers = getLocalUsers();
        const user = localUsers.find(u => u.email === email && u.password === password);
        if (!user && localUsers.length === 0 && email === 'admin@mazylab.com' && password === 'admin123') {
             const adminUser: User = { email, password, role: '管理員', name: 'Admin' };
             saveLocalUsers([adminUser]);
             setCurrentUser(adminUser);
             localStorage.setItem('app_current_user', JSON.stringify(adminUser));
             setLoginModalOpen(false);
             return { success: true };
        }
        if (user) {
            setCurrentUser(user);
            localStorage.setItem('app_current_user', JSON.stringify(user));
            setLoginModalOpen(false);
            return { success: true };
        }
        return { success: false, message: '電子郵件或密碼錯誤 (本地模式)' };
    }

    // Supabase 模式優化
    try {
      // [優化] 移除不必要的 Promise.race 競爭，直接呼叫，避免 race condition 導致的未定義行為
      // 也不要在登入前強制 signOut，這可能會導致狀態混亂
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      console.log("Supabase login successful");
      setLoginModalOpen(false);
      
      // 登入成功後再異步觸發 user 列表更新，不要 await 它以免卡住 UI
      fetchUsers(); 
      
      return { success: true };

    } catch (error: any) {
      console.error("Login exception:", error);
      let msg = error.message || String(error);
      
      if (msg.includes('Invalid API key')) msg = '系統設定錯誤：Supabase API Key 無效。';
      else if (msg.includes('Invalid login credentials')) msg = '帳號或密碼錯誤';
      else if (msg.includes('Email not confirmed')) msg = '您的 Email 尚未驗證。';
      else if (msg.includes('Failed to fetch')) msg = '無法連接至伺服器，請檢查您的網路連線。';
      
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    setCurrentUser(null);
    setAdminPanelOpen(false);
    localStorage.removeItem('app_current_user');
    if (isSupabaseConfigured) {
        supabase.auth.signOut().catch(console.error);
    }
  };

  const register = async (details: { email: string; password: string; name: string; phone: string; }): Promise<{ success: boolean; messageKey: string; errorDetail?: string }> => {
    if (!details.name.trim() || !details.phone.trim()) return { success: false, messageKey: 'missingRequiredFields' };

    if (!isSupabaseConfigured) {
        const localUsers = getLocalUsers();
        if (localUsers.some(u => u.email === details.email)) return { success: false, messageKey: 'registrationFailed' };
        const isFirstUser = localUsers.length === 0;
        const newUser: User = { ...details, role: isFirstUser ? '管理員' : '一般用戶' };
        saveLocalUsers([...localUsers, newUser]);
        return { success: true, messageKey: 'registrationSuccess' };
    }

    try {
      justRegistered.current = true; 
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: details.email,
        password: details.password,
        options: { data: { name: details.name, phone: details.phone } }
      });

      if (signUpError) {
        justRegistered.current = false;
        if (signUpError.message.includes('already registered')) return { success: false, messageKey: 'registrationFailed', errorDetail: 'Email already exists' }; 
        throw signUpError;
      }

      if (data.user) {
        if (data.session) supabase.auth.signOut().catch(console.error);
        justRegistered.current = false; 
        
        // 註冊成功後，嘗試手動觸發一次 fetchUsers (雖然 Realtime 應該會捕捉到)
        fetchUsers();
        
        return { success: true, messageKey: 'registrationSuccess' };
      }
      justRegistered.current = false;
      return { success: false, messageKey: 'registrationFailed', errorDetail: 'Unknown error' };
    } catch (error: any) {
      justRegistered.current = false;
      return { success: false, messageKey: 'registrationFailed', errorDetail: error.message };
    }
  };

  const addUser = async (user: User): Promise<{ success: boolean; messageKey: string }> => {
    if (!isSupabaseConfigured) {
        const localUsers = getLocalUsers();
        if (localUsers.some(u => u.email === user.email)) return { success: false, messageKey: 'registrationFailed' }; 
        saveLocalUsers([...localUsers, user]);
        return { success: true, messageKey: 'addUserSuccess' };
    }
    return { success: false, messageKey: 'registrationFailed' }; 
  };

  const updateUser = async (email: string, data: Partial<User>): Promise<{ success: boolean; messageKey: string }> => {
    if (!isSupabaseConfigured) {
        const localUsers = getLocalUsers();
        const idx = localUsers.findIndex(u => u.email === email);
        if (idx === -1) return { success: false, messageKey: 'userNotFound' };
        localUsers[idx] = { ...localUsers[idx], ...data };
        saveLocalUsers(localUsers);
        if (currentUser?.email === email) {
            setCurrentUser(localUsers[idx]);
            localStorage.setItem('app_current_user', JSON.stringify(localUsers[idx]));
        }
        return { success: true, messageKey: 'updateUserSuccess' };
    }

    try {
      const { data: profileData } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      if (!profileData) {
          return { success: false, messageKey: 'userNotFound' };
      }

      const updates: any = {};
      if (data.name) updates.name = data.name;
      if (data.phone) updates.phone = data.phone;
      if (data.role) updates.role = data.role;
      if (data.subscriptionExpiry !== undefined) updates.subscription_expiry = data.subscriptionExpiry;

      const { error } = await supabase.from('profiles').update(updates).eq('id', profileData.id);
      if (error) throw error;

      fetchUsers();
      if (currentUser?.email === email) {
          const { data: newP } = await supabase.from('profiles').select('*').eq('id', profileData.id).single();
          if (newP) {
             const p = newP as any;
             setCurrentUser({
                email: p.email || '',
                role: (p.role || '一般用戶') as UserRole,
                name: p.name || undefined,
                phone: p.phone || undefined,
                subscriptionExpiry: p.subscription_expiry || undefined
             });
          }
      }
      return { success: true, messageKey: 'updateUserSuccess' };
    } catch (error) {
      console.error("Update failed:", error);
      return { success: false, messageKey: 'updateUserSuccess' };
    }
  };

  const deleteUser = async (email: string): Promise<{ success: boolean; messageKey: string }> => {
    if (currentUser?.email === email) return { success: false, messageKey: 'cannotDeleteSelf' };
    if (!isSupabaseConfigured) {
        const local = getLocalUsers();
        const newU = local.filter(u => u.email !== email);
        if (newU.length === local.length) return { success: false, messageKey: 'userNotFound' };
        saveLocalUsers(newU);
        return { success: true, messageKey: 'deleteUserSuccess' };
    }
    try {
       const { data } = await supabase.from('profiles').select('id').eq('email', email).single();
       if (!data) return { success: false, messageKey: 'userNotFound' };
       const { error } = await supabase.from('profiles').delete().eq('id', data.id);
       if (error) throw error;
       fetchUsers();
       return { success: true, messageKey: 'deleteUserSuccess' };
    } catch { return { success: false, messageKey: 'userNotFound' }; }
  };

  // Expose fetchUsers for manual refresh if needed
  const refreshUsers = async () => {
      await fetchUsers();
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, login, logout, register, addUser, updateUser, deleteUser, refreshUsers, isLoginModalOpen, setLoginModalOpen, isAdminPanelOpen, setAdminPanelOpen }}>
      {children}
    </AuthContext.Provider>
  );
};
