
import React, { createContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
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
  isFailsafeMode: boolean;
}

export const AuthContext = createContext<AuthContextType>(null!);

const LOCAL_USERS_KEY = 'app_users';
const EMERGENCY_ADMIN_KEY = 'emergency_admin_session';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isAdminPanelOpen, setAdminPanelOpen] = useState(false);
  
  // Failsafe Mode = TRUE means we are using "admin123" or offline mode. 
  const [isFailsafeMode, setIsFailsafeMode] = useState(false);
  
  const justRegistered = useRef(false);

  // --- Local Storage Helpers ---
  const getLocalUsers = (): User[] => {
    try {
      const stored = localStorage.getItem(LOCAL_USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Local storage error:", e);
      return [];
    }
  };

  const saveLocalUsers = (newUsers: User[]) => {
    try {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(newUsers));
      setUsers(newUsers);
    } catch (e) {
      console.error("Failed to save users locally:", e);
    }
  };
  // ----------------------------------------

  // [Helper] Fetch Users
  const fetchUsers = useCallback(async () => {
    // 1. Local/Emergency Mode
    if (isFailsafeMode || !isSupabaseConfigured) {
        console.log("[Auth] Fetching users from LocalStorage (Offline Mode)");
        let localData = getLocalUsers();
        // Ensure admin sees themselves
        if (currentUser && !localData.find(u => u.email === currentUser.email)) {
            localData.unshift(currentUser);
            saveLocalUsers(localData);
        } else {
            setUsers(localData);
        }
        return;
    }

    // 2. Cloud Mode (Real Admin)
    try {
        const { data, error } = await supabase.from('profiles').select('*');
        
        if (error) {
            console.warn("[Auth] Supabase fetch error (RLS?):", error.message);
            // DO NOT overwrite local data with empty if fetch failed.
            // Just keep what we have or try to load from local cache as backup.
            if (users.length === 0) {
                setUsers(getLocalUsers());
            }
            return;
        }

        if (data) {
            const mappedUsers: User[] = data.map((u: any) => ({
                id: u.id,
                email: u.email,
                role: u.role as UserRole,
                name: u.name,
                phone: u.phone,
                subscriptionExpiry: u.subscription_expiry,
            })).sort((a, b) => new Date(b.subscriptionExpiry || 0).getTime() - new Date(a.subscriptionExpiry || 0).getTime());

            // Update local cache with fresh cloud data
            saveLocalUsers(mappedUsers);
        }
    } catch (e) {
        console.warn("[Auth] Fetch exception:", e);
    }
  }, [isFailsafeMode, currentUser]);

  // [Init] Check Session on Mount
  useEffect(() => {
    const initAuth = async () => {
        // 1. Check Emergency Session FIRST
        const emergencyAdmin = localStorage.getItem(EMERGENCY_ADMIN_KEY);
        if (emergencyAdmin) {
            console.log("[Auth] Restoring Emergency Session");
            const adminUser = JSON.parse(emergencyAdmin);
            setCurrentUser(adminUser);
            setIsFailsafeMode(true);
            return; 
        }

        // 2. Check Supabase Session
        if (isSupabaseConfigured) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setIsFailsafeMode(false);
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
                if (profile) {
                    setCurrentUser({
                        id: profile.id, email: profile.email, role: profile.role,
                        name: profile.name, phone: profile.phone, subscriptionExpiry: profile.subscription_expiry,
                    });
                } else {
                    setCurrentUser({ id: session.user.id, email: session.user.email!, role: '一般用戶' });
                }
            }
        } else {
            // No Supabase Config -> Force Local Mode
            setIsFailsafeMode(true);
            const storedUser = localStorage.getItem('current_user');
            if (storedUser) setCurrentUser(JSON.parse(storedUser));
        }
    };

    initAuth();
  }, []);

  // [Listener] Supabase Auth State Changes
  useEffect(() => {
      if (isFailsafeMode || !isSupabaseConfigured) return;

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (localStorage.getItem(EMERGENCY_ADMIN_KEY)) return; 

          if (event === 'SIGNED_OUT') {
              setCurrentUser(null);
              setUsers([]);
          } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
               const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
               if (profile) {
                   setCurrentUser({
                       id: profile.id, email: profile.email, role: profile.role,
                       name: profile.name, phone: profile.phone, subscriptionExpiry: profile.subscription_expiry,
                   });
               }
               fetchUsers();
          }
      });

      return () => {
          subscription.unsubscribe();
      };
  }, [isFailsafeMode, fetchUsers]);

  useEffect(() => {
      if (currentUser?.role === '管理員') {
          fetchUsers();
      }
  }, [currentUser, isFailsafeMode, fetchUsers]);


  // --- Actions ---

  const login = async (emailInput: string, passInput: string): Promise<AuthResult> => {
    const email = emailInput.trim().toLowerCase();
    const pass = passInput.trim();

    // 1. Emergency Backdoor (Offline Mode)
    if (email === 'admin@mazylab.com' && pass === 'admin123') {
         const adminUser: User = { 
             id: 'local_admin_emergency', 
             email, 
             role: '管理員', 
             name: 'System Admin (Offline)', 
             phone: '0900000000' 
         };
         
         localStorage.setItem(EMERGENCY_ADMIN_KEY, JSON.stringify(adminUser));
         setIsFailsafeMode(true); 
         setCurrentUser(adminUser);
         setLoginModalOpen(false);
         alert("您已進入「離線緊急管理模式」。\n在此模式下所做的變更僅存於本地瀏覽器，不會同步至資料庫。");
         return { success: true, messageKey: 'loginSuccess' };
    }

    if (!isSupabaseConfigured) {
        const localUsers = getLocalUsers();
        const user = localUsers.find(u => u.email === email && u.password === pass);
        if (user) {
            const { password, ...safeUser } = user;
            setCurrentUser(safeUser as User);
            localStorage.setItem('current_user', JSON.stringify(safeUser));
            setLoginModalOpen(false);
            return { success: true, messageKey: 'loginSuccess' };
        }
        return { success: false, messageKey: 'loginFailed' };
    }

    // 2. Real Supabase Login (Cloud Mode)
    try {
        // REMOVED Promise.race timeout. Let Supabase handle connection time.
        // This prevents the "Timeout" error on cold starts.
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });

        if (error) {
            return { success: false, messageKey: 'loginFailed', message: error.message };
        }
        
        // Success
        setIsFailsafeMode(false); 
        setLoginModalOpen(false);
        return { success: true, messageKey: 'loginSuccess' };

    } catch (e: any) {
        console.error("Login exception:", e);
        return { success: false, messageKey: 'loginFailed', message: e.message || "Network Error" };
    }
  };

  const logout = async () => {
    // 1. Clear Local State
    setCurrentUser(null);
    setUsers([]);
    setIsFailsafeMode(false);
    
    // 2. Clear Local Storage Persistence
    localStorage.removeItem(EMERGENCY_ADMIN_KEY);
    localStorage.removeItem('current_user');
    
    // 3. Clear Supabase Tokens HARD (prevents sticky sessions)
    if (isSupabaseConfigured) {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.warn("SignOut error ignored:", e);
        }
        // Manually clear Supabase keys from localStorage to ensure fresh start
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
        });
    }

    // 4. Force Reload Page (The only way to guarantee a clean slate)
    window.location.reload();
  };

  const register = async (details: { email: string; password: string; name: string; phone: string; }): Promise<AuthResult> => {
    if (!details.name.trim() || !details.phone.trim()) return { success: false, messageKey: 'missingRequiredFields' };

    if (isFailsafeMode || !isSupabaseConfigured) {
        const localUsers = getLocalUsers();
        if (localUsers.some(u => u.email === details.email)) return { success: false, messageKey: 'registrationFailed' };
        const newUser: User = { ...details, role: localUsers.length === 0 ? '管理員' : '一般用戶' };
        saveLocalUsers([...localUsers, newUser]);
        return { success: true, messageKey: 'registrationSuccess' };
    }

    try {
      justRegistered.current = true; 
      
      // Removed Timeout
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: details.email,
        password: details.password,
        options: { data: { name: details.name, phone: details.phone } }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        await supabase.from('profiles').upsert([{
            id: data.user.id,
            email: details.email,
            name: details.name,
            phone: details.phone,
            role: '一般用戶',
            updated_at: new Date().toISOString(),
        }]);
        
        // Auto logout to allow clean login
        await supabase.auth.signOut(); 
        
        return { success: true, messageKey: 'registrationSuccess' };
      }
      return { success: false, messageKey: 'registrationFailed' };
    } catch (error: any) {
      return { success: false, messageKey: 'registrationFailed', errorDetail: error.message };
    } finally {
        justRegistered.current = false;
    }
  };

  const addUser = async (details: { email: string; password: string; role: UserRole; name: string; phone: string }): Promise<AuthResult> => {
      // Local Add Only (Client SDK restriction)
      const localUsers = getLocalUsers();
      if (localUsers.some(u => u.email === details.email)) return { success: false, messageKey: 'userExists' };
      const newUser: User = { ...details, id: `local_${Date.now()}` };
      saveLocalUsers([...localUsers, newUser]);
      return { success: true, messageKey: 'userAdded' };
  };

  const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
      // 1. OFFLINE / FAILSAFE MODE -> Local Update
      if (isFailsafeMode || !isSupabaseConfigured) {
          const currentUsers = getLocalUsers();
          const idx = currentUsers.findIndex(u => u.email === email);
          if (idx !== -1) {
              currentUsers[idx] = { ...currentUsers[idx], ...updates };
              saveLocalUsers(currentUsers);
              if (currentUser?.email === email) setCurrentUser({ ...currentUser, ...updates });
              return { success: true, messageKey: 'userUpdated', message: "已更新本地資料 (離線模式)" };
          }
          return { success: false, messageKey: 'userNotFound' };
      }

      // 2. CLOUD MODE -> Database First (PESSIMISTIC UPDATE)
      try {
          // Find real DB ID
          const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
          
          if (!targetUser) {
              return { success: false, messageKey: 'userNotFound', message: "雲端資料庫找不到此用戶，更新失敗。" };
          }

          const dbUpdates: any = { updated_at: new Date().toISOString() };
          if (updates.name) dbUpdates.name = updates.name;
          if (updates.phone) dbUpdates.phone = updates.phone;
          if (updates.role) dbUpdates.role = updates.role;
          if (updates.subscriptionExpiry) dbUpdates.subscription_expiry = updates.subscriptionExpiry;

          // Attempt DB Update
          const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', targetUser.id);
          
          if (error) {
              console.error("Supabase update error:", error);
              // CRITICAL: Return FAILURE so Admin Panel knows the DB update failed. 
              // DO NOT update local state here.
              return { 
                  success: false, 
                  messageKey: 'updateUserSuccess', 
                  message: `資料庫更新失敗: ${error.message} (可能權限不足)` 
              };
          }

          // ONLY update local state IF DB update was successful
          const currentUsers = getLocalUsers();
          const idx = currentUsers.findIndex(u => u.email === email);
          if (idx !== -1) {
              currentUsers[idx] = { ...currentUsers[idx], ...updates };
              saveLocalUsers(currentUsers);
          }
          if (currentUser?.email === email) {
              setCurrentUser({ ...currentUser, ...updates });
          }

          return { success: true, messageKey: 'userUpdated', message: "雲端資料庫更新成功！" };

      } catch (e: any) {
          return { success: false, messageKey: 'userUpdated', message: e.message };
      }
  };

  const deleteUser = async (email: string): Promise<AuthResult> => {
      // 1. Local Delete
      if (isFailsafeMode || !isSupabaseConfigured) {
          const currentUsers = getLocalUsers().filter(u => u.email !== email);
          saveLocalUsers(currentUsers);
          if (currentUser?.email === email) logout();
          return { success: true, messageKey: 'userDeleted', message: "已刪除本地資料 (離線模式)" };
      }

      // 2. Cloud Delete
      try {
          const { error } = await supabase.from('profiles').delete().eq('email', email);
          if (error) {
              return { success: false, messageKey: 'userDeleted', message: `資料庫刪除失敗: ${error.message}` };
          }
          
          // Sync local state
          const currentUsers = getLocalUsers().filter(u => u.email !== email);
          saveLocalUsers(currentUsers);
          
          return { success: true, messageKey: 'userDeleted' };
      } catch (e: any) {
          return { success: false, messageKey: 'userDeleted', message: e.message };
      }
  };

  const refreshUsers = async () => {
      await fetchUsers();
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
      refreshUsers,
      isFailsafeMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};
