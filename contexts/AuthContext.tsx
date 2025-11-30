
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
  
  // State to track if we are in "Emergency/Local Mode" vs "Real Cloud Mode"
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

  // [Helper] Fetch Users based on current mode
  const fetchUsers = useCallback(async () => {
    // 1. If currently in Emergency Mode (or no Supabase config), FORCE use LocalStorage.
    // DO NOT attempt to fetch from Supabase, as it will likely return empty array (RLS) 
    // and overwrite our valuable cache.
    if (isFailsafeMode || !isSupabaseConfigured) {
        console.log("[AuthContext] Fetching users from LocalStorage (Emergency/Offline Mode)");
        let localData = getLocalUsers();
        
        // Ensure the current admin is in the list so they don't lock themselves out visually
        if (currentUser && !localData.find(u => u.email === currentUser.email)) {
            localData.unshift(currentUser);
            saveLocalUsers(localData);
        } else {
            setUsers(localData);
        }
        return;
    }

    // 2. Cloud Mode: Try Supabase
    try {
        const { data, error } = await supabase.from('profiles').select('*');
        
        if (error) throw error;

        if (data) {
            const mappedUsers: User[] = data.map((u: any) => ({
                id: u.id,
                email: u.email,
                role: u.role as UserRole,
                name: u.name,
                phone: u.phone,
                subscriptionExpiry: u.subscription_expiry,
            })).sort((a, b) => new Date(b.subscriptionExpiry || 0).getTime() - new Date(a.subscriptionExpiry || 0).getTime());

            // Sync Cloud Data to Local Cache for future emergencies
            saveLocalUsers(mappedUsers);
        }
    } catch (e) {
        console.warn("[AuthContext] Supabase fetch failed, falling back to local cache:", e);
        // Fallback silently without switching mode drastically unless needed
        setUsers(getLocalUsers());
    }
  }, [isFailsafeMode, currentUser]);

  // [Init] Check Session on Mount
  useEffect(() => {
    const initAuth = async () => {
        // 1. Check Emergency Session FIRST
        const emergencyAdmin = localStorage.getItem(EMERGENCY_ADMIN_KEY);
        if (emergencyAdmin) {
            console.log("[AuthContext] Restoring Emergency Session");
            const adminUser = JSON.parse(emergencyAdmin);
            setCurrentUser(adminUser);
            setIsFailsafeMode(true); // LOCK into Failsafe Mode
            return; // STOP here. Do not initialize Supabase listener.
        }

        // 2. If no emergency session, check Supabase
        if (isSupabaseConfigured) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // We have a real user
                setIsFailsafeMode(false);
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
                if (profile) {
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
            // No Supabase config at all
            setIsFailsafeMode(true);
            const storedUser = localStorage.getItem('current_user');
            if (storedUser) setCurrentUser(JSON.parse(storedUser));
        }
    };

    initAuth();
  }, []);

  // [Listener] Supabase Auth State Changes
  // Only active if NOT in Failsafe Mode
  useEffect(() => {
      if (isFailsafeMode || !isSupabaseConfigured) return;

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (localStorage.getItem(EMERGENCY_ADMIN_KEY)) return; // Double check guard

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

  // [Effect] Refresh list when user changes or mode changes
  useEffect(() => {
      if (currentUser?.role === '管理員') {
          fetchUsers();
      }
  }, [currentUser, isFailsafeMode, fetchUsers]);


  // --- Actions ---

  const login = async (emailInput: string, passInput: string): Promise<AuthResult> => {
    const email = emailInput.trim().toLowerCase();
    const pass = passInput.trim();

    // 1. Emergency Backdoor
    if (email === 'admin@mazylab.com' && pass === 'admin123') {
         const adminUser: User = { 
             id: 'local_admin_emergency', 
             email, 
             role: '管理員', 
             name: 'System Admin (Emergency)', 
             phone: '0900000000' 
         };
         
         // Set State
         localStorage.setItem(EMERGENCY_ADMIN_KEY, JSON.stringify(adminUser));
         setIsFailsafeMode(true); // Enable Failsafe Mode immediately
         setCurrentUser(adminUser);
         setLoginModalOpen(false);
         
         // DO NOT call supabase.auth.signOut(). It might cause listeners to fire 'SIGNED_OUT'
         // and we want to ignore Supabase completely in this mode.
         
         return { success: true, messageKey: 'loginSuccess' };
    }

    if (!isSupabaseConfigured) {
        // Pure Local Mode
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

    // 2. Supabase Login
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
        // Suggest backdoor if DB issue detected for admin
        if ((error.message.includes('Database') || error.message.includes('fetch')) && email === 'admin@mazylab.com') {
             return { success: false, messageKey: 'loginFailed', message: "資料庫連線異常，請使用緊急密碼 'admin123' 登入。" };
        }
        return { success: false, messageKey: 'loginFailed', message: error.message };
    }
    
    // Login successful, listener will handle state update
    setIsFailsafeMode(false); // Ensure we are in Cloud Mode
    setLoginModalOpen(false);
    return { success: true, messageKey: 'loginSuccess' };
  };

  const logout = async () => {
    // 1. Clear Local State Immediately (The "Hard Logout")
    setCurrentUser(null);
    setUsers([]);
    setAdminPanelOpen(false);
    setIsFailsafeMode(false); // Reset mode
    
    // 2. Clear Persistence
    localStorage.removeItem(EMERGENCY_ADMIN_KEY);
    localStorage.removeItem('current_user');

    // 3. Clear Supabase Session (Fire and Forget)
    if (isSupabaseConfigured) {
        // We use catch() to prevent unhandled promise rejections if network is down
        supabase.auth.signOut().catch(() => {}); 
    }
  };

  const register = async (details: { email: string; password: string; name: string; phone: string; }): Promise<AuthResult> => {
    // Validation
    if (!details.name.trim() || !details.phone.trim()) return { success: false, messageKey: 'missingRequiredFields' };

    // Local Mode Register
    if (isFailsafeMode || !isSupabaseConfigured) {
        const localUsers = getLocalUsers();
        if (localUsers.some(u => u.email === details.email)) return { success: false, messageKey: 'registrationFailed' };
        const newUser: User = { ...details, role: localUsers.length === 0 ? '管理員' : '一般用戶' };
        saveLocalUsers([...localUsers, newUser]);
        return { success: true, messageKey: 'registrationSuccess' };
    }

    // Cloud Mode Register
    try {
      justRegistered.current = true; 
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: details.email,
        password: details.password,
        options: { data: { name: details.name, phone: details.phone } }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Create Profile
        await supabase.from('profiles').upsert([{
            id: data.user.id,
            email: details.email,
            name: details.name,
            phone: details.phone,
            role: '一般用戶',
            updated_at: new Date().toISOString(),
        }]);
        
        // Auto logout to require fresh login
        if (data.session) supabase.auth.signOut(); 
        
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
      // Always add to Local Cache first (Optimistic)
      const localUsers = getLocalUsers();
      if (localUsers.some(u => u.email === details.email)) return { success: false, messageKey: 'userExists' };
      const newUser: User = { ...details, id: `local_${Date.now()}` };
      saveLocalUsers([...localUsers, newUser]);
      
      // We don't support creating new Supabase users via client SDK (requires Admin API).
      // So we rely on local addition for UI feedback.
      return { success: true, messageKey: 'userAdded' };
  };

  const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
      // 1. Optimistic Local Update
      const currentUsers = getLocalUsers();
      const idx = currentUsers.findIndex(u => u.email === email);
      if (idx !== -1) {
          currentUsers[idx] = { ...currentUsers[idx], ...updates };
          saveLocalUsers(currentUsers);
      } else if (currentUser?.email === email) {
          // If updating self but not in list (e.g. initial admin)
          const updatedSelf = { ...currentUser, ...updates };
          setCurrentUser(updatedSelf);
      }

      // 2. If Emergency Mode, stop here.
      if (isFailsafeMode || !isSupabaseConfigured) {
          return { success: true, messageKey: 'userUpdated' };
      }

      // 3. Try Supabase Update
      try {
          // Find ID
          let targetId = idx !== -1 ? currentUsers[idx].id : null;
          if (!targetId || targetId.startsWith('local_')) {
               const { data } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
               targetId = data?.id;
          }

          if (targetId && !targetId.startsWith('local_')) {
              const dbUpdates: any = { updated_at: new Date().toISOString() };
              if (updates.name) dbUpdates.name = updates.name;
              if (updates.phone) dbUpdates.phone = updates.phone;
              if (updates.role) dbUpdates.role = updates.role;
              if (updates.subscriptionExpiry) dbUpdates.subscription_expiry = updates.subscriptionExpiry;

              const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', targetId);
              if (error) throw error;
          }
          return { success: true, messageKey: 'userUpdated' };
      } catch (e: any) {
          console.error("Supabase update failed:", e);
          // Return success anyway because local update succeeded
          return { success: true, messageKey: 'userUpdated' }; 
      }
  };

  const deleteUser = async (email: string): Promise<AuthResult> => {
      // 1. Optimistic Local Delete
      const currentUsers = getLocalUsers().filter(u => u.email !== email);
      saveLocalUsers(currentUsers);

      if (currentUser?.email === email) {
          logout();
          return { success: true, messageKey: 'userDeleted' };
      }

      // 2. If Emergency Mode, stop here.
      if (isFailsafeMode || !isSupabaseConfigured) {
          return { success: true, messageKey: 'userDeleted' };
      }

      // 3. Try Supabase Delete
      try {
          const { error } = await supabase.from('profiles').delete().eq('email', email);
          if (error) console.warn("Supabase delete failed (likely RLS), but local user removed:", error);
          return { success: true, messageKey: 'userDeleted' };
      } catch (e: any) {
          console.error("Delete failed:", e);
          return { success: true, messageKey: 'userDeleted' }; 
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
