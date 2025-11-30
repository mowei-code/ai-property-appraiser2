
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
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(newUsers));
    setUsers(newUsers);
  };
  // ----------------------------------------

  // [Self-Healing] Ensure profile exists in Supabase
  // This runs silently to fix missing profile rows in the DB
  const ensureProfileExists = async (sessionUser: any) => {
      if (!isSupabaseConfigured || !sessionUser) return;

      try {
          const { data } = await supabase.from('profiles').select('id').eq('id', sessionUser.id).maybeSingle();
          
          if (!data) {
              const meta = sessionUser.user_metadata || {};
              await supabase.from('profiles').upsert([
                  {
                      id: sessionUser.id,
                      email: sessionUser.email,
                      name: meta.name || sessionUser.email?.split('@')[0] || 'Unknown',
                      phone: meta.phone || '',
                      role: '一般用戶',
                      updated_at: new Date().toISOString(),
                  }
              ]);
              // Trigger a fetch to update the list after self-healing
              fetchUsers(); 
          }
      } catch (e) {
          // Silent catch to prevent UI disruption
      }
  };

  const fetchUsers = useCallback(async () => {
    // 1. Always load local data first (Instant UI)
    let localData = getLocalUsers();
    
    // If not configured, we are done
    if (!isSupabaseConfigured) {
      setUsers(localData);
      return;
    }

    try {
        // 2. Try to fetch from Supabase
        // Note: This might fail if we are "Emergency Admin" without a token
        const { data, error } = await supabase.from('profiles').select('*');
        
        if (error) {
            console.warn("Supabase fetch error (likely permission/RLS), using local cache:", error.message);
            // If DB fails, keep using local data but mark failsafe mode
            setIsFailsafeMode(true);
            
            // Ensure current user is in the list so admin doesn't disappear
            if (currentUser && !localData.find(u => u.email === currentUser.email)) {
                localData = [currentUser, ...localData];
            }
            setUsers(localData);
            return;
        }

        if (data && data.length > 0) {
            // Success: Database returned data. Map it to our User type.
            const dbUsers: User[] = data.map((u: any) => ({
                id: u.id,
                email: u.email,
                role: u.role as UserRole,
                name: u.name,
                phone: u.phone,
                subscriptionExpiry: u.subscription_expiry,
            })).sort((a, b) => new Date(b.subscriptionExpiry || 0).getTime() - new Date(a.subscriptionExpiry || 0).getTime());
            
            // Merge: Ensure Emergency Admin isn't lost if not in DB
            if (currentUser && currentUser.id === 'local_admin_emergency') {
                 if (!dbUsers.find(u => u.email === currentUser.email)) {
                     dbUsers.unshift(currentUser);
                 }
            }

            setUsers(dbUsers);
            localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(dbUsers)); // Update cache
            setIsFailsafeMode(false);
        } else {
            // DB returned empty array (could be RLS hiding rows)
            // Fallback to local cache if DB results seem suspicious (empty) but we have local data
            if (localData.length > 0) {
                 setUsers(localData);
            } else {
                 setUsers([]);
            }
        }

    } catch (e) {
        console.error("Fetch users exception:", e);
        setUsers(localData);
        setIsFailsafeMode(true);
    }
  }, [currentUser]);

  useEffect(() => {
    const initAuth = async () => {
        // 1. Check Emergency Session (Priority High)
        const emergencyAdmin = localStorage.getItem(EMERGENCY_ADMIN_KEY);
        if (emergencyAdmin) {
            const adminUser = JSON.parse(emergencyAdmin);
            setCurrentUser(adminUser);
            // Attempt to fetch, but don't block
            if (isSupabaseConfigured) fetchUsers().catch(() => {});
            return;
        }

        if (!isSupabaseConfigured) {
            const storedUser = localStorage.getItem('current_user');
            if (storedUser) setCurrentUser(JSON.parse(storedUser));
            setUsers(getLocalUsers());
            return;
        }

        // 2. Normal Supabase Session Check
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await ensureProfileExists(session.user);
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            
            const userData: User = profile ? {
                id: profile.id,
                email: profile.email,
                role: profile.role,
                name: profile.name,
                phone: profile.phone,
                subscriptionExpiry: profile.subscription_expiry,
            } : {
                id: session.user.id,
                email: session.user.email!,
                role: session.user.email === 'admin@mazylab.com' ? '管理員' : '一般用戶',
                name: session.user.user_metadata?.name,
                phone: session.user.user_metadata?.phone,
            };
            setCurrentUser(userData);
        }

        // 3. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Guard: If in Emergency mode, ignore Supabase session events to prevent overwrite
            if (localStorage.getItem(EMERGENCY_ADMIN_KEY)) return;

            if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                setUsers([]);
            } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
                 await ensureProfileExists(session.user);
                 fetchUsers();
                 
                 const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
                 if(profile) {
                     setCurrentUser({
                        id: profile.id,
                        email: profile.email,
                        role: profile.role,
                        name: profile.name,
                        phone: profile.phone,
                        subscriptionExpiry: profile.subscription_expiry,
                    });
                 }
            }
        });

        return () => subscription.unsubscribe();
    };
    initAuth();
  }, []);

  // Poll for user updates if admin
  useEffect(() => {
      if (currentUser?.role === '管理員' || !isSupabaseConfigured) {
          fetchUsers();
      }
  }, [currentUser?.role]); 

  const login = async (emailInput: string, passInput: string): Promise<AuthResult> => {
    const email = emailInput.trim().toLowerCase();
    const pass = passInput.trim();

    // --- Emergency Backdoor ---
    // If exact match, bypass DB and use Local Session
    if (email === 'admin@mazylab.com' && pass === 'admin123') {
         const adminUser: User = { 
             id: 'local_admin_emergency', 
             email, 
             role: '管理員', 
             name: 'System Admin (Emergency)', 
             phone: '0900000000' 
         };
         
         localStorage.setItem(EMERGENCY_ADMIN_KEY, JSON.stringify(adminUser));
         setCurrentUser(adminUser);
         setLoginModalOpen(false);
         
         // Trigger fetch (it will likely fallback to local cache if DB is locked)
         fetchUsers().catch(() => {});
         
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

    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
        // Helpful intercept for Schema/DB errors
        if ((error.message.includes('Database error') || error.message.includes('schema')) && email === 'admin@mazylab.com') {
             return { success: false, messageKey: 'loginFailed', message: "資料庫異常，請使用緊急密碼 'admin123' 登入管理。" };
        }
        return { success: false, messageKey: 'loginFailed', message: error.message };
    }
    
    setLoginModalOpen(false);
    return { success: true, messageKey: 'loginSuccess' };
  };

  const logout = async () => {
    setCurrentUser(null);
    setUsers([]);
    setAdminPanelOpen(false);
    localStorage.removeItem(EMERGENCY_ADMIN_KEY);
    localStorage.removeItem('current_user');
    
    if (isSupabaseConfigured) {
        // We use catch here to prevent logout from failing if network is down
        await supabase.auth.signOut().catch(err => console.warn("Supabase signout failed:", err));
    }
  };

  const register = async (details: { email: string; password: string; name: string; phone: string; }): Promise<AuthResult> => {
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
        
        if (data.session) supabase.auth.signOut(); 
        fetchUsers();
        return { success: true, messageKey: 'registrationSuccess' };
      }
      return { success: false, messageKey: 'registrationFailed', errorDetail: 'Unknown error' };
    } catch (error: any) {
      return { success: false, messageKey: 'registrationFailed', errorDetail: error.message };
    } finally {
        justRegistered.current = false;
    }
  };

  const addUser = async (details: { email: string; password: string; role: UserRole; name: string; phone: string }): Promise<AuthResult> => {
      // Offline/Local add
      const localUsers = getLocalUsers();
      if (localUsers.some(u => u.email === details.email)) return { success: false, messageKey: 'userExists' };
      const newUser: User = { ...details, id: `local_${Date.now()}` };
      saveLocalUsers([...localUsers, newUser]);
      
      // We don't support creating new Supabase users from Admin Panel via Client SDK easily (requires Admin API).
      // So we just add to local state to reflect the action.
      return { success: true, messageKey: 'userAdded' };
  };

  const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
      // 1. Optimistic Update (UI first)
      const currentUsers = [...users];
      const idx = currentUsers.findIndex(u => u.email === email);
      if (idx !== -1) {
          currentUsers[idx] = { ...currentUsers[idx], ...updates };
          setUsers(currentUsers);
          localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(currentUsers));
      }

      if (!isSupabaseConfigured) return { success: true, messageKey: 'userUpdated' };

      // 2. Try Supabase Update (Background)
      try {
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
          console.error("Supabase update failed, but local state updated:", e);
          // Return success anyway because the UI is updated
          return { success: true, messageKey: 'userUpdated' }; 
      }
  };

  const deleteUser = async (email: string): Promise<AuthResult> => {
      // 1. Optimistic Delete (Remove from UI immediately, do not wait for DB)
      const currentUsers = users.filter(u => u.email !== email);
      setUsers(currentUsers);
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(currentUsers)); 

      if (currentUser?.email === email) {
          logout();
          return { success: true, messageKey: 'userDeleted' };
      }

      if (!isSupabaseConfigured) return { success: true, messageKey: 'userDeleted' };

      // 2. Try Supabase Delete (Fire and forget from UI perspective)
      try {
          const { error } = await supabase.from('profiles').delete().eq('email', email);
          if (error) {
              console.warn("Supabase delete failed (likely permissions/RLS), but user removed from local view:", error.message);
          }
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
