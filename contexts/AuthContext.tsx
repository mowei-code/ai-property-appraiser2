
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
const SYSTEM_ADMIN_EMAIL = 'admin@mazylab.com';

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
      // Only update state from local if we are NOT in cloud mode
      if (!isSupabaseConfigured) {
          setUsers(newUsers);
      }
    } catch (e) {
      console.error("Failed to save users locally:", e);
    }
  };
  // ----------------------------------------

  // [Helper] Fetch Users
  const fetchUsers = useCallback(async () => {
    // 1. Local/Emergency Mode (No Supabase)
    if (isFailsafeMode || !isSupabaseConfigured) {
        console.log("[Auth] Local Mode: Fetching from LocalStorage");
        let localData = getLocalUsers();
        // Ensure admin sees themselves in local mode
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
            console.error("[Auth] Supabase fetch error:", error.message);
            // CRITICAL: Do not fallback to local storage on error in cloud mode to avoid phantom state
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

            // STRICT SOURCE OF TRUTH: Update state directly from DB
            setUsers(mappedUsers);
            
            // Clean local storage cache to prevent phantom users if we ever fall back
            localStorage.removeItem(LOCAL_USERS_KEY);
        }
    } catch (e) {
        console.error("[Auth] Fetch exception:", e);
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
                
                // [INVINCIBLE ADMIN CHECK]
                // Even if profile is missing or DB error, if email matches system admin, grant access.
                if (session.user.email === SYSTEM_ADMIN_EMAIL) {
                    setCurrentUser({
                        id: session.user.id,
                        email: session.user.email!,
                        role: '管理員', // FORCE ADMIN ROLE
                        name: profile?.name || 'System Admin',
                        phone: profile?.phone || '',
                        subscriptionExpiry: profile?.subscription_expiry
                    });
                } else if (profile) {
                    setCurrentUser({
                        id: profile.id, email: profile.email, role: profile.role,
                        name: profile.name, phone: profile.phone, subscriptionExpiry: profile.subscription_expiry,
                    });
                } else {
                    // Fallback if profile missing (shouldn't happen often)
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
               let profile: any = null;
               try {
                   const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
                   profile = data;
               } catch (e) {
                   console.error("Profile fetch error in listener (ignoring for Admin):", e);
               }
               
               const isSystemAdmin = session.user.email === SYSTEM_ADMIN_EMAIL;

               // [RECOVERY] If profile is missing (e.g. deleted from profiles table but exists in Auth), recreate it.
               if (!profile) {
                   console.log("Profile missing for logged in user. Attempting to recreate...");
                   const newProfile = {
                       id: session.user.id,
                       email: session.user.email!,
                       name: session.user.user_metadata?.name || (isSystemAdmin ? 'System Admin' : 'User'),
                       phone: session.user.user_metadata?.phone || '',
                       role: isSystemAdmin ? '管理員' : '一般用戶',
                       updated_at: new Date().toISOString(),
                   };
                   
                   // Try insert, but don't block login if it fails (e.g. RLS error)
                   const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
                   if (!insertError) {
                       profile = newProfile; 
                   } else {
                       console.error("Failed to recreate profile:", insertError);
                   }
               }

               // [INVINCIBLE ADMIN] Force role in local state regardless of DB
               if (isSystemAdmin) {
                   setCurrentUser({
                       id: session.user.id, 
                       email: session.user.email!, 
                       role: '管理員', // FORCE ADMIN
                       name: profile?.name || 'System Admin',
                       phone: profile?.phone || '',
                       subscriptionExpiry: profile?.subscription_expiry
                   });
               } else if (profile) {
                   setCurrentUser({
                       id: profile.id, email: profile.email, role: profile.role,
                       name: profile.name, phone: profile.phone, subscriptionExpiry: profile.subscription_expiry,
                   });
               } else {
                   // Minimal fallback
                   setCurrentUser({ 
                       id: session.user.id, 
                       email: session.user.email!, 
                       role: '一般用戶' 
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

  const activateEmergencyAdmin = () => {
      console.warn("⚠️ Activating Emergency Admin Mode.");
      const adminUser: User = {
          id: 'emergency_admin',
          email: SYSTEM_ADMIN_EMAIL,
          role: '管理員',
          name: 'System Admin (Emergency)',
          phone: '0900000000',
          subscriptionExpiry: new Date(Date.now() + 31536000000).toISOString() // 1 year
      };
      
      setCurrentUser(adminUser);
      localStorage.setItem(EMERGENCY_ADMIN_KEY, JSON.stringify(adminUser));
      setIsFailsafeMode(true);
      setLoginModalOpen(false);
      return { success: true, messageKey: 'loginSuccess', message: '已啟用緊急管理員模式' };
  };

  const login = async (emailInput: string, passInput: string): Promise<AuthResult> => {
    const email = emailInput.trim().toLowerCase();
    const pass = passInput.trim();

    // Check for specific admin credentials to enable emergency bypass
    const isSystemAdmin = email === SYSTEM_ADMIN_EMAIL;
    const isEmergencyPass = pass === 'admin123';

    // 1. Supabase Login (Standard Flow)
    if (isSupabaseConfigured) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });

            if (error) {
                console.error("Supabase login error:", error.message);
                
                // [EMERGENCY BYPASS]
                // If cloud login fails for the specific admin, force local entry.
                if (isSystemAdmin && isEmergencyPass) {
                    return activateEmergencyAdmin();
                }

                return { success: false, messageKey: 'loginFailed', message: error.message };
            }

            if (data.user) {
                // Success: Cloud Mode
                setIsFailsafeMode(false);
                setLoginModalOpen(false);
                localStorage.removeItem(EMERGENCY_ADMIN_KEY); 
                return { success: true, messageKey: 'loginSuccess' };
            }
        } catch (e: any) {
            console.error("Login network exception:", e);
            // [EMERGENCY BYPASS] Network Error Case
            if (isSystemAdmin && isEmergencyPass) {
                return activateEmergencyAdmin();
            }
            return { success: false, messageKey: 'loginFailed', message: e.message || "Network Error" };
        }
    }

    // 2. Local Mode
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

    return { success: false, messageKey: 'loginFailed', message: '未知錯誤' };
  };

  const logout = async () => {
    setCurrentUser(null);
    setUsers([]);
    setIsFailsafeMode(false);
    localStorage.removeItem(EMERGENCY_ADMIN_KEY);
    localStorage.removeItem('current_user');
    
    if (isSupabaseConfigured) {
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.warn("SignOut error ignored:", e);
        }
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
        });
    }
    window.location.reload();
  };

  const register = async (details: { email: string; password: string; name: string; phone: string; }): Promise<AuthResult> => {
    if (!details.name.trim() || !details.phone.trim()) return { success: false, messageKey: 'missingRequiredFields' };

    // Check Emergency Bypass for Registration attempts too
    const isSystemAdmin = details.email.toLowerCase() === SYSTEM_ADMIN_EMAIL;
    const isEmergencyPass = details.password === 'admin123';

    if (isFailsafeMode || !isSupabaseConfigured) {
        const localUsers = getLocalUsers();
        if (localUsers.some(u => u.email === details.email)) return { success: false, messageKey: 'registrationFailed' };
        const newUser: User = { ...details, role: localUsers.length === 0 ? '管理員' : '一般用戶' };
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

      // [SMART RECOVERY & EMERGENCY BYPASS]
      if (signUpError) {
          console.log("Registration error:", signUpError.message);
          
          // 1. Try normal fallback login
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email: details.email,
              password: details.password
          });

          if (!loginError && loginData.user) {
              console.log("Fallback login successful. Closing modal.");
              setLoginModalOpen(false);
              return { success: true, messageKey: 'loginSuccess' };
          }
          
          // 2. If fallback login also fails (e.g. wrong password or db error), AND it's the admin, FORCE ENTRY.
          if (isSystemAdmin && isEmergencyPass) {
              return activateEmergencyAdmin();
          }
          
          throw signUpError;
      }

      if (data.user) {
        const role = isSystemAdmin ? '管理員' : '一般用戶';

        await supabase.from('profiles').upsert([{
            id: data.user.id,
            email: details.email,
            name: details.name,
            phone: details.phone,
            role: role,
            updated_at: new Date().toISOString(),
        }]);
        
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
      // Admin Add User Logic
      if (isFailsafeMode || !isSupabaseConfigured) {
          // Local Add
          const localUsers = getLocalUsers();
          if (localUsers.some(u => u.email === details.email)) return { success: false, messageKey: 'registrationFailed' }; // User exists
          const newUser: User = { ...details, id: `local_${Date.now()}` };
          saveLocalUsers([...localUsers, newUser]);
          return { success: true, messageKey: 'addUserSuccess' };
      }

      // Cloud Add - We typically use `signUp` but that logs the admin out.
      return { success: false, messageKey: 'registrationFailed', message: '雲端模式下，請讓使用者自行註冊，或使用 Supabase Dashboard 新增。' };
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
          // Find real DB ID based on Email
          const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
          
          if (!targetUser) {
              return { success: false, messageKey: 'userNotFound', message: "雲端資料庫找不到此用戶，更新失敗。" };
          }

          const dbUpdates: any = { updated_at: new Date().toISOString() };
          if (updates.name) dbUpdates.name = updates.name;
          if (updates.phone) dbUpdates.phone = updates.phone;
          if (updates.role) dbUpdates.role = updates.role;
          
          if (updates.subscriptionExpiry !== undefined) {
              dbUpdates.subscription_expiry = updates.subscriptionExpiry;
          }

          // Attempt DB Update
          const { data: updatedData, error } = await supabase
              .from('profiles')
              .update(dbUpdates)
              .eq('id', targetUser.id)
              .select();
          
          if (error) {
              console.error("Supabase update error:", error);
              return { 
                  success: false, 
                  messageKey: 'updateUserSuccess', 
                  message: `資料庫更新失敗: ${error.message} (可能權限不足)` 
              };
          }

          if (!updatedData || updatedData.length === 0) {
               console.error("Supabase update returned no data (RLS blocking?)");
               return { 
                  success: false, 
                  messageKey: 'updateUserSuccess', 
                  message: "更新失敗：資料庫未回傳結果，您可能沒有權限修改此用戶 (RLS)。" 
              };
          }

          // ONLY update local state IF DB update was successful
          await fetchUsers();
          
          if (currentUser?.email === email) {
              // Preserve current hardcoded role if admin
              const newRole = (currentUser.email === SYSTEM_ADMIN_EMAIL) ? '管理員' : updates.role || currentUser.role;
              setCurrentUser({ ...currentUser, ...updates, role: newRole });
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
          
          await fetchUsers();
          
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
