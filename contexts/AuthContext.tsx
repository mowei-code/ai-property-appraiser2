
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

  // --- Local Storage Helpers (Fallback) ---
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

  // [Self-Healing] 自動檢查並修復 user profile
  const ensureProfileExists = async (sessionUser: any) => {
      if (!isSupabaseConfigured || !sessionUser) return;

      try {
          const { data } = await supabase.from('profiles').select('id').eq('id', sessionUser.id).maybeSingle();
          
          if (!data) {
              console.log("[AuthContext] Profile missing for user, activating self-healing...");
              const meta = sessionUser.user_metadata || {};
              const { error: insertError } = await supabase.from('profiles').upsert([
                  {
                      id: sessionUser.id,
                      email: sessionUser.email,
                      name: meta.name || sessionUser.email?.split('@')[0] || 'Unknown',
                      phone: meta.phone || '',
                      role: '一般用戶',
                      updated_at: new Date().toISOString(),
                  }
              ]);
              if (insertError) console.error("[AuthContext] Self-healing failed:", insertError);
              else fetchUsers(); 
          }
      } catch (e) {
          console.warn("[AuthContext] Profile check warning:", e);
      }
  };

  const fetchUsers = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setUsers(getLocalUsers());
      return;
    }

    try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        
        if (data) {
            const sortedData = data.sort((a: any, b: any) => {
                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            });

            const mappedUsers: User[] = sortedData.map((u: any) => ({
                id: u.id,
                email: u.email,
                role: u.role as UserRole,
                name: u.name,
                phone: u.phone,
                subscriptionExpiry: u.subscription_expiry,
            }));
            
            if (currentUser && !mappedUsers.find(u => u.email === currentUser.email) && currentUser.id !== 'local_admin_emergency') {
                mappedUsers.unshift(currentUser);
            }

            setUsers(mappedUsers);
            localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(mappedUsers)); 
        }
    } catch (e) {
        console.error("Fetch users failed, falling back to cache:", e);
        const cached = getLocalUsers();
        if (currentUser && !cached.find(u => u.email === currentUser.email)) {
            cached.unshift(currentUser);
        }
        setUsers(cached);
        setIsFailsafeMode(true);
    }
  }, [currentUser]);

  useEffect(() => {
    const initAuth = async () => {
        // 1. Check for Emergency Admin Session first (Higher priority)
        const emergencyAdmin = localStorage.getItem(EMERGENCY_ADMIN_KEY);
        if (emergencyAdmin) {
            const adminUser = JSON.parse(emergencyAdmin);
            setCurrentUser(adminUser);
            // Even if we are emergency admin, try to fetch users list if possible
            if (isSupabaseConfigured) fetchUsers();
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
            if (profile) {
                setCurrentUser({
                    id: profile.id,
                    email: profile.email,
                    role: profile.role,
                    name: profile.name,
                    phone: profile.phone,
                    subscriptionExpiry: profile.subscription_expiry,
                });
            } else {
                const isAdmin = session.user.email === 'admin@mazylab.com';
                setCurrentUser({
                    id: session.user.id,
                    email: session.user.email!,
                    role: isAdmin ? '管理員' : '一般用戶',
                    name: session.user.user_metadata?.name,
                    phone: session.user.user_metadata?.phone,
                });
            }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                // Only clear if not in emergency mode (handled by explicit logout)
                if (!localStorage.getItem(EMERGENCY_ADMIN_KEY)) {
                    setCurrentUser(null);
                    setUsers([]);
                }
            } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
                 localStorage.removeItem(EMERGENCY_ADMIN_KEY); // Clear emergency flag on real login
                 await ensureProfileExists(session.user);

                 const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
                 if (profile) {
                    setCurrentUser({
                        id: profile.id,
                        email: profile.email,
                        role: profile.role,
                        name: profile.name,
                        phone: profile.phone,
                        subscriptionExpiry: profile.subscription_expiry,
                    });
                 } else {
                    const isAdmin = session.user.email === 'admin@mazylab.com';
                    setCurrentUser({
                        id: session.user.id,
                        email: session.user.email!,
                        role: isAdmin ? '管理員' : '一般用戶',
                        name: session.user.user_metadata?.name,
                        phone: session.user.user_metadata?.phone,
                    });
                 }
                 fetchUsers();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    };
    initAuth();
  }, []);

  useEffect(() => {
      if (currentUser?.role === '管理員' || !isSupabaseConfigured) {
          fetchUsers();
      }
  }, [currentUser, fetchUsers]);

  const login = async (email: string, pass: string): Promise<AuthResult> => {
    // --- [Emergency Backdoor] ---
    // Bypass database/auth errors specifically for the default admin account.
    // This ensures the admin can always log in to fix settings even if Supabase is misconfigured or throwing schema errors.
    if (email === 'admin@mazylab.com' && pass === 'admin123') {
         const adminUser: User = { 
             id: 'local_admin_emergency', 
             email, 
             role: '管理員', 
             name: 'System Admin', 
             phone: '0900000000' 
         };
         setCurrentUser(adminUser);
         localStorage.setItem(EMERGENCY_ADMIN_KEY, JSON.stringify(adminUser));
         setLoginModalOpen(false);
         
         // Try to fetch users list for the admin panel, but don't block login if it fails
         if (isSupabaseConfigured) {
             fetchUsers().catch(console.error);
         }
         
         return { success: true, messageKey: 'loginSuccess' };
    }
    // ----------------------------

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
        return { success: false, messageKey: 'loginFailed', message: error.message };
    }
    
    setLoginModalOpen(false);
    return { success: true, messageKey: 'loginSuccess' };
  };

  const logout = async () => {
    // Clear Emergency Admin Session
    if (localStorage.getItem(EMERGENCY_ADMIN_KEY)) {
        localStorage.removeItem(EMERGENCY_ADMIN_KEY);
        setCurrentUser(null);
        setUsers([]);
        return;
    }

    if (!isSupabaseConfigured) {
        setCurrentUser(null);
        localStorage.removeItem('current_user');
        return;
    }
    await supabase.auth.signOut();
    setCurrentUser(null);
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

      if (signUpError) {
        justRegistered.current = false;
        if (signUpError.message.includes('already registered')) return { success: false, messageKey: 'registrationFailed', errorDetail: 'Email already exists' }; 
        throw signUpError;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert([
            {
                id: data.user.id,
                email: details.email,
                name: details.name,
                phone: details.phone,
                role: '一般用戶',
                updated_at: new Date().toISOString(),
            }
        ]);

        if (profileError) {
            console.error("Profile creation failed (Admin panel might not show this user):", profileError);
        }

        if (data.session) supabase.auth.signOut().catch(console.error);
        justRegistered.current = false; 
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

  const addUser = async (details: { email: string; password: string; role: UserRole; name: string; phone: string }): Promise<AuthResult> => {
      if (!isSupabaseConfigured) {
          const localUsers = getLocalUsers();
          if (localUsers.some(u => u.email === details.email)) return { success: false, messageKey: 'userExists' };
          const newUser: User = { ...details };
          saveLocalUsers([...localUsers, newUser]);
          return { success: true, messageKey: 'userAdded' };
      }
      return { success: false, messageKey: 'featureNotAvailableOnline', message: '請使用註冊頁面建立新帳號' }; 
  };

  const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
      // Local User Logic
      if (!isSupabaseConfigured || currentUser?.id === 'local_admin_emergency') {
          // If in emergency mode, we can't really update supabase users easily via client API if we are not authenticated properly against supabase.
          // But if we are simulating edits on the fetched list...
          if (!isSupabaseConfigured) {
              const localUsers = getLocalUsers();
              const idx = localUsers.findIndex(u => u.email === email);
              if (idx === -1) return { success: false, messageKey: 'userNotFound' };
              
              localUsers[idx] = { ...localUsers[idx], ...updates };
              saveLocalUsers(localUsers);
              return { success: true, messageKey: 'userUpdated' };
          }
      }

      try {
          let targetId = users.find(u => u.email === email)?.id;
          
          if (!targetId && currentUser?.email === email) {
              const {data} = await supabase.auth.getSession();
              targetId = data.session?.user.id;
          }

          if (!targetId) {
               const { data } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
               targetId = data?.id;
          }

          if (!targetId) return { success: false, messageKey: 'userNotFound' };

          const dbUpdates: any = { updated_at: new Date().toISOString() };
          if (updates.name) dbUpdates.name = updates.name;
          if (updates.phone) dbUpdates.phone = updates.phone;
          if (updates.role) dbUpdates.role = updates.role;
          if (updates.subscriptionExpiry) dbUpdates.subscription_expiry = updates.subscriptionExpiry;

          const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', targetId);
          if (error) throw error;
          
          fetchUsers();
          return { success: true, messageKey: 'userUpdated' };

      } catch (e: any) {
          console.error("Update failed", e);
          return { success: false, messageKey: 'updateFailed', message: e.message };
      }
  };

  const deleteUser = async (email: string): Promise<AuthResult> => {
      if (!isSupabaseConfigured) {
          const localUsers = getLocalUsers();
          const newUsers = localUsers.filter(u => u.email !== email);
          saveLocalUsers(newUsers);
          if (currentUser?.email === email) logout();
          return { success: true, messageKey: 'userDeleted' };
      }
      
      try {
          const { error } = await supabase.from('profiles').delete().eq('email', email);
          if (error) throw error;
          fetchUsers();
          return { success: true, messageKey: 'userDeleted' };
      } catch (e: any) {
          return { success: false, messageKey: 'updateFailed', message: e.message };
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
