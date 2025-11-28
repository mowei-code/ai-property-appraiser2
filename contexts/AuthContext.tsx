
import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  
  // Track if a registration process is active to prevent auto-login flash
  const justRegistered = useRef(false);

  // --- Local Storage Helpers (Fallback Mode) ---
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
  // ---------------------------------------------

  // Fetch all users (profiles)
  const fetchUsers = async () => {
    if (!isSupabaseConfigured) {
        setUsers(getLocalUsers());
        return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        const profiles = data as any[];
        const mappedUsers: User[] = profiles.map(p => ({
          email: p.email || '',
          role: (p.role || '一般用戶') as UserRole,
          name: p.name || undefined, 
          phone: p.phone || undefined,
          subscriptionExpiry: p.subscription_expiry || undefined,
          id: p.id
        }));
        setUsers(mappedUsers);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error.message || error);
    }
  };

  // Helper to fetch profile
  const fetchProfile = async (userId: string, email: string) => {
      const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

      return profileData;
  };

  // Initial Load: Check Session & Fetch Users
  useEffect(() => {
    const initSession = async () => {
      if (!isSupabaseConfigured) {
          const storedUser = localStorage.getItem('app_current_user');
          if (storedUser) {
              setCurrentUser(JSON.parse(storedUser));
          }
          fetchUsers();
          return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email || '');
          
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
            setCurrentUser({
                email: session.user.email || '',
                role: '一般用戶'
            });
        }
      }
      
      fetchUsers();
    };

    initSession();

    if (isSupabaseConfigured) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (justRegistered.current && event === 'SIGNED_IN') {
             return;
          }

          if (session?.user) {
             // Wait for DB Trigger to complete insertion
             if (event === 'SIGNED_IN') await new Promise(r => setTimeout(r, 1000));

             const profile = await fetchProfile(session.user.id, session.user.email || '');
              
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
                setCurrentUser({
                    email: session.user.email || '',
                    role: '一般用戶'
                });
            }
            fetchUsers();
          } else {
            setCurrentUser(null);
            setUsers([]);
          }
        });
        return () => subscription.unsubscribe();
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
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

    try {
      // Force sign out first to clear any stale state that might cause issues
      await supabase.auth.signOut();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
          throw error;
      }
      setLoginModalOpen(false);
      return { success: true };
    } catch (error: any) {
      console.error("Login failed:", error);
      let msg = error.message || '登入失敗，請檢查帳號密碼';
      
      if (msg.includes('Invalid API key')) {
          msg = '系統設定錯誤：Supabase API Key 無效。';
      } else if (msg.includes('Invalid login credentials')) {
          msg = '帳號或密碼錯誤';
      } else if (msg.includes('Email not confirmed')) {
          msg = '您的 Email 尚未驗證。請檢查您的信箱。';
      } else if (msg.includes('Database error querying schema') || msg.includes('PGRST200')) {
          msg = '資料庫連線權限異常 (Schema Permission)。請聯繫管理員修復權限 (GRANT USAGE)。';
      }
      
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    setCurrentUser(null);
    setAdminPanelOpen(false);
    
    localStorage.removeItem('app_current_user');

    if (!isSupabaseConfigured) {
        return;
    }

    try {
        await supabase.auth.signOut();
    } catch (err) {
        console.error("Logout exception:", err);
    }
  };

  const register = async (details: { email: string; password: string; name: string; phone: string; }): Promise<{ success: boolean; messageKey: string; errorDetail?: string }> => {
    if (!details.name.trim() || !details.phone.trim()) {
        return { success: false, messageKey: 'missingRequiredFields' };
    }

    if (!isSupabaseConfigured) {
        const localUsers = getLocalUsers();
        if (localUsers.some(u => u.email === details.email)) {
            return { success: false, messageKey: 'registrationFailed' };
        }
        
        const isFirstUser = localUsers.length === 0;
        const role: UserRole = isFirstUser ? '管理員' : '一般用戶';
        
        const newUser: User = { ...details, role };
        saveLocalUsers([...localUsers, newUser]);
        
        return { success: true, messageKey: 'registrationSuccess' };
    }

    try {
      justRegistered.current = true; 

      // 1. Sign up with Metadata
      // 重要：我們將 name 和 phone 放在 options.data 中，這樣 DB Trigger 就可以直接讀取並寫入 profiles
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: details.email,
        password: details.password,
        options: {
            data: {
                name: details.name,
                phone: details.phone
            }
        }
      });

      if (signUpError) {
        justRegistered.current = false;
        if (signUpError.message.includes('already registered')) {
             return { success: false, messageKey: 'registrationFailed', errorDetail: 'Email already exists' }; 
        }
        throw signUpError;
      }

      if (data.user) {
        // 2. NO Manual Profile Insert Here
        // 我們依賴資料庫 Trigger 自動建立 Profile，避免前端權限錯誤。
        
        // Force Sign Out to prevent auto-login state confusion
        if (data.session) {
            await supabase.auth.signOut();
        }

        justRegistered.current = false; 
        return { success: true, messageKey: 'registrationSuccess' };
      }
      
      justRegistered.current = false;
      return { success: false, messageKey: 'registrationFailed', errorDetail: 'Unknown error during sign up' };

    } catch (error: any) {
      justRegistered.current = false;
      console.error("Registration error:", error);
      let detail = error.message;
      return { success: false, messageKey: 'registrationFailed', errorDetail: detail };
    }
  };

  const addUser = async (user: User): Promise<{ success: boolean; messageKey: string }> => {
    if (!isSupabaseConfigured) {
        const localUsers = getLocalUsers();
        if (localUsers.some(u => u.email === user.email)) {
             return { success: false, messageKey: 'registrationFailed' }; 
        }
        saveLocalUsers([...localUsers, user]);
        return { success: true, messageKey: 'addUserSuccess' };
    }
    
    console.warn("Client-side 'addUser' is restricted in Supabase.");
    return { success: false, messageKey: 'registrationFailed' }; 
  };

  const updateUser = async (email: string, data: Partial<User>): Promise<{ success: boolean; messageKey: string }> => {
    if (!isSupabaseConfigured) {
        const localUsers = getLocalUsers();
        const idx = localUsers.findIndex(u => u.email === email);
        if (idx === -1) return { success: false, messageKey: 'userNotFound' };
        
        const updatedUser = { ...localUsers[idx], ...data };
        localUsers[idx] = updatedUser;
        saveLocalUsers(localUsers);
        
        if (currentUser?.email === email) {
            setCurrentUser(updatedUser);
            localStorage.setItem('app_current_user', JSON.stringify(updatedUser));
        }
        return { success: true, messageKey: 'updateUserSuccess' };
    }

    try {
      // Find ID by Email
      const { data: profileData } = await supabase.from('profiles').select('id').eq('email', email).single();
      if (!profileData) return { success: false, messageKey: 'userNotFound' };

      const updates: any = {};
      if (data.name) updates.name = data.name;
      if (data.phone) updates.phone = data.phone;
      if (data.role) updates.role = data.role;
      if (data.subscriptionExpiry !== undefined) updates.subscription_expiry = data.subscriptionExpiry;

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileData.id);

      if (updateError) throw updateError;

      fetchUsers();
      // Refresh local state if updating self
      if (currentUser?.email === email) {
          const { data: newProfileData } = await supabase.from('profiles').select('*').eq('id', profileData.id).single();
          if (newProfileData) {
             const newProfile = newProfileData as any;
             setCurrentUser({
                email: newProfile.email || '',
                role: (newProfile.role || '一般用戶') as UserRole,
                name: newProfile.name || undefined,
                phone: newProfile.phone || undefined,
                subscriptionExpiry: newProfile.subscription_expiry || undefined
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
    if (currentUser?.email === email) {
      return { success: false, messageKey: 'cannotDeleteSelf' };
    }

    if (!isSupabaseConfigured) {
        const localUsers = getLocalUsers();
        const newUsers = localUsers.filter(u => u.email !== email);
        if (newUsers.length === localUsers.length) return { success: false, messageKey: 'userNotFound' };
        saveLocalUsers(newUsers);
        return { success: true, messageKey: 'deleteUserSuccess' };
    }

    try {
       const { data: profileData } = await supabase.from('profiles').select('id').eq('email', email).single();
       if (!profileData) return { success: false, messageKey: 'userNotFound' };

       // Admin deleting user via RLS
       const { error } = await supabase
         .from('profiles')
         .delete()
         .eq('id', profileData.id);

       if (error) throw error;

       fetchUsers();
       return { success: true, messageKey: 'deleteUserSuccess' };
    } catch (error: any) {
       console.error("Delete failed:", error);
       return { success: false, messageKey: 'userNotFound' };
    }
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, users, login, logout, register, 
        addUser, updateUser, deleteUser,
        isLoginModalOpen, setLoginModalOpen,
        isAdminPanelOpen, setAdminPanelOpen
    }}>
      {children}
    </AuthContext.Provider>
  );
};
