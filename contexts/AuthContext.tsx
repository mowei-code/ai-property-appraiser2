
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
        // Fallback to local storage
        setUsers(getLocalUsers());
        return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      
      if (data) {
        // Explicitly cast data to any[] to avoid TypeScript inference issues with Supabase client
        const profiles = data as any[];
        const mappedUsers: User[] = profiles.map(p => ({
          email: p.email || '',
          role: (p.role || '一般用戶') as UserRole,
          name: p.name || undefined, 
          phone: p.phone || undefined,
          subscriptionExpiry: p.subscription_expiry || undefined,
          id: p.id // Internal use for updates
        }));
        setUsers(mappedUsers);
      }
    } catch (error: any) {
      console.error("Error fetching users:", error.message || error);
    }
  };

  // Helper to fetch profile with retry logic and AUTO-HEAL
  const fetchProfileWithRetry = async (userId: string, email: string) => {
      // 1. Try to fetch existing profile
      const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(); // Use maybeSingle to avoid error on 404

      if (profileData) {
          return profileData;
      }

      // 2. If profile is missing (but Auth exists), attempt to create it (Self-Healing)
      console.warn(`User ${email} exists in Auth but Profile is missing. Attempting to auto-heal...`);
      
      // Check if this is the designated admin email to restore permissions
      const role = email === 'admin@mazylab.com' ? '管理員' : '一般用戶';

      const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([
              { 
                  id: userId,
                  email: email,
                  name: email.split('@')[0], // Default name from email
                  phone: '',
                  role: role
              }
          ])
          .select()
          .single();
      
      if (insertError) {
          console.error("Failed to auto-create profile:", insertError);
          return null;
      }
      
      console.log("Profile auto-healed successfully.");
      return newProfile;
  };

  // Initial Load: Check Session & Fetch Users
  useEffect(() => {
    const initSession = async () => {
      if (!isSupabaseConfigured) {
          // Fallback initialization: Check local storage for logged in user
          const storedUser = localStorage.getItem('app_current_user');
          if (storedUser) {
              setCurrentUser(JSON.parse(storedUser));
          }
          fetchUsers();
          return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const profile = await fetchProfileWithRetry(session.user.id, session.user.email || '');
          
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
            // Fallback if profile creation absolutely fails
            setCurrentUser({
                email: session.user.email || '',
                role: '一般用戶'
            });
        }
      }
      
      fetchUsers();
    };

    initSession();

    // Listen for auth changes (Only for Supabase)
    if (isSupabaseConfigured) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          // Prevent auto-login flash if we just registered (we want to force manual login flow)
          if (justRegistered.current && event === 'SIGNED_IN') {
             return;
          }

          if (session?.user) {
             // Wait a tiny bit for the trigger (if any) or insertion to complete
             if (event === 'SIGNED_IN') await new Promise(r => setTimeout(r, 500));

             const profile = await fetchProfileWithRetry(session.user.id, session.user.email || '');
              
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
        // Local Mock Login
        const localUsers = getLocalUsers();
        const user = localUsers.find(u => u.email === email && u.password === password);
        
        // Default Admin Fallback (if no users exist or specific hardcoded admin)
        if (!user && localUsers.length === 0 && email === 'admin@mazylab.com' && password === 'admin123') {
             const adminUser: User = { email, password, role: '管理員', name: 'Admin' };
             // Save default admin to local storage so they exist next time
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
      
      // Translate common Supabase errors
      if (msg.includes('Invalid API key')) {
          msg = '系統設定錯誤：Supabase API Key 無效。請檢查環境變數是否正確 (有無多餘空白)。';
      } else if (msg.includes('Invalid login credentials')) {
          // Special handling for legacy admin migration
          if (email === 'admin@mazylab.com') {
              msg = '【系統提示】帳號密碼錯誤。若您剛清除資料庫，請重新註冊此帳號。';
          } else {
              msg = '帳號或密碼錯誤';
          }
      } else if (msg.includes('Email not confirmed')) {
          msg = '您的 Email 尚未驗證。請檢查您的信箱，或請管理員確認 Supabase 的 Site URL 設定是否正確 (導致連結無效)。';
      }
      
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    // 1. Force Clear UI State Immediately (Optimistic update)
    // 這確保即使後端 API 卡住，使用者介面也會立即顯示為登出狀態
    setCurrentUser(null);
    setAdminPanelOpen(false);
    
    // 2. Clear Local Fallback
    localStorage.removeItem('app_current_user');

    if (!isSupabaseConfigured) {
        return;
    }

    // 3. Attempt Supabase SignOut
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.warn("Supabase signOut completed with warning:", error.message);
        }
    } catch (err) {
        // 如果 signOut 拋出錯誤 (例如網絡問題)，我們已經在第1步清除了UI狀態，所以只需記錄錯誤
        console.error("Logout exception:", err);
    }
  };

  const register = async (details: { email: string; password: string; name: string; phone: string; }): Promise<{ success: boolean; messageKey: string; errorDetail?: string }> => {
    if (!details.name.trim() || !details.phone.trim()) {
        return { success: false, messageKey: 'missingRequiredFields' };
    }

    if (!isSupabaseConfigured) {
        // Local Mock Register
        const localUsers = getLocalUsers();
        if (localUsers.some(u => u.email === details.email)) {
            return { success: false, messageKey: 'registrationFailed' };
        }
        
        // If this is the first user, make them Admin
        const isFirstUser = localUsers.length === 0;
        const role: UserRole = isFirstUser ? '管理員' : '一般用戶';
        
        const newUser: User = { ...details, role };
        saveLocalUsers([...localUsers, newUser]);
        
        return { success: true, messageKey: 'registrationSuccess' };
    }

    try {
      justRegistered.current = true; // Set flag to block auto-login listener

      // 1. Sign up in Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: details.email,
        password: details.password,
      });

      if (signUpError) {
        justRegistered.current = false; // Reset flag on error
        if (signUpError.message.includes('already registered')) {
             return { success: false, messageKey: 'registrationFailed', errorDetail: 'Email already exists' }; 
        }
        throw signUpError;
      }

      if (data.user) {
        // 2. Create Profile Record
        // Check if any profiles exist to determine if this is the first user (Admin)
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        // Fix logic: if count is 0, this IS the first user.
        // Also hardcode admin@mazylab.com to always be admin if possible
        const role: UserRole = (count === 0 || details.email === 'admin@mazylab.com') ? '管理員' : '一般用戶';

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: data.user.id,
              email: details.email,
              name: details.name,
              phone: details.phone,
              role: role
            }
          ]);

        if (profileError) {
            console.error("Profile creation failed:", profileError);
            // Don't fail the whole registration, let the auto-heal logic in useEffect handle it on first login
            // But log it clearly.
            // Don't return here, proceed to signOut to keep flow clean
        }
        
        // 3. Force Sign Out to ensure the user stays on the Success Screen
        // This prevents the app from auto-logging in and showing the Main Panel underneath the modal.
        if (data.session) {
            await supabase.auth.signOut();
        }

        justRegistered.current = false; // Reset flag
        
        // Use timeout to allow RLS/Auth state to propagate if needed, though not strictly required after signout
        fetchUsers(); 
        
        return { success: true, messageKey: 'registrationSuccess' };
      }
      
      justRegistered.current = false; // Reset flag
      return { success: false, messageKey: 'registrationFailed', errorDetail: 'Unknown error during sign up' };

    } catch (error: any) {
      justRegistered.current = false; // Reset flag
      console.error("Registration error:", error);
      let detail = error.message;
      if (detail.includes('Invalid API key')) {
          detail = '系統設定錯誤：Supabase API Key 無效。請檢查環境變數。';
      }
      return { success: false, messageKey: 'registrationFailed', errorDetail: detail };
    }
  };

  const addUser = async (user: User): Promise<{ success: boolean; messageKey: string }> => {
    if (!isSupabaseConfigured) {
        // Local Add User
        const localUsers = getLocalUsers();
        if (localUsers.some(u => u.email === user.email)) {
             return { success: false, messageKey: 'registrationFailed' }; 
        }
        saveLocalUsers([...localUsers, user]);
        return { success: true, messageKey: 'addUserSuccess' };
    }
    
    console.warn("Client-side 'addUser' with password is restricted in Supabase for security.");
    return { success: false, messageKey: 'registrationFailed' }; 
  };

  const updateUser = async (email: string, data: Partial<User>): Promise<{ success: boolean; messageKey: string }> => {
    if (!isSupabaseConfigured) {
        // Local Update
        const localUsers = getLocalUsers();
        const idx = localUsers.findIndex(u => u.email === email);
        if (idx === -1) return { success: false, messageKey: 'userNotFound' };
        
        const updatedUser = { ...localUsers[idx], ...data };
        localUsers[idx] = updatedUser;
        saveLocalUsers(localUsers);
        
        // Update current user if it matches
        if (currentUser?.email === email) {
            setCurrentUser(updatedUser);
            localStorage.setItem('app_current_user', JSON.stringify(updatedUser));
        }
        return { success: true, messageKey: 'updateUserSuccess' };
    }

    try {
      // 1. Try to find the user ID in the cached list first
      // Assuming 'users' state now might contain 'id' if we fetched it, 
      // but 'User' type typically doesn't enforce 'id'. We cast 'users' to check.
      let userId = (users as any[]).find(u => u.email === email)?.id; 
      
      // 2. If not found locally (maybe list didn't load fully due to RLS), try to fetch ID directly from DB
      if (!userId) {
          const { data: profileData } = await supabase.from('profiles').select('id').eq('email', email).single();
          if (profileData) userId = profileData.id;
      }

      if (!userId) return { success: false, messageKey: 'userNotFound' };

      const updates: any = {};
      if (data.name) updates.name = data.name;
      if (data.phone) updates.phone = data.phone;
      if (data.role) updates.role = data.role;
      if (data.subscriptionExpiry !== undefined) updates.subscription_expiry = data.subscriptionExpiry;

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (updateError) throw updateError;

      fetchUsers();
      // If we updated ourselves, refresh local state
      if (currentUser?.email === email) {
          const { data: newProfileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
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
      return { success: false, messageKey: 'updateUserSuccess' }; // Return error message actually
    }
  };

  const deleteUser = async (email: string): Promise<{ success: boolean; messageKey: string }> => {
    if (currentUser?.email === email) {
      return { success: false, messageKey: 'cannotDeleteSelf' };
    }

    if (!isSupabaseConfigured) {
        // Local Delete
        const localUsers = getLocalUsers();
        const newUsers = localUsers.filter(u => u.email !== email);
        if (newUsers.length === localUsers.length) return { success: false, messageKey: 'userNotFound' };
        saveLocalUsers(newUsers);
        return { success: true, messageKey: 'deleteUserSuccess' };
    }

    try {
       const { data: profileData } = await supabase.from('profiles').select('id').eq('email', email).single();
       if (!profileData) return { success: false, messageKey: 'userNotFound' };

       const { error } = await supabase
         .from('profiles')
         .delete()
         .eq('id', profileData.id);

       if (error) throw error;

       fetchUsers();
       return { success: true, messageKey: 'deleteUserSuccess' };
    } catch (error: any) {
       console.error("Delete failed:", error);
       if (error.message?.includes('violates foreign key constraint') || error.code === '23503') {
           return { success: false, messageKey: 'deleteUserSuccess' };
       }
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
