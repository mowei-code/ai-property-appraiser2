
import React, { createContext, useState, useEffect, ReactNode } from 'react';
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
          subscriptionExpiry: p.subscription_expiry || undefined
        }));
        setUsers(mappedUsers);
      }
    } catch (error: any) {
      // Improved error handling to show specific message
      console.error("Error fetching users:", error.message || error);
    }
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
        // Fetch extended profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileData) {
          const profile = profileData as any;
          setCurrentUser({
            email: profile.email || '',
            role: (profile.role || '一般用戶') as UserRole,
            name: profile.name || undefined,
            phone: profile.phone || undefined,
            subscriptionExpiry: profile.subscription_expiry || undefined
          });
        } else {
            // Should verify if user exists in Auth but not in Profiles (edge case)
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
             const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profileData) {
              const profile = profileData as any;
              setCurrentUser({
                email: profile.email || '',
                role: (profile.role || '一般用戶') as UserRole,
                name: profile.name || undefined,
                phone: profile.phone || undefined,
                subscriptionExpiry: profile.subscription_expiry || undefined
              });
            } else {
                // Handle case where profile doesn't exist yet (e.g. immediately after signup before insert completes)
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
      return { success: false, message: error.message || '登入失敗，請檢查帳號密碼' };
    }
  };

  const logout = async () => {
    if (!isSupabaseConfigured) {
        localStorage.removeItem('app_current_user');
        setCurrentUser(null);
        setAdminPanelOpen(false);
        return;
    }
    await supabase.auth.signOut();
    setCurrentUser(null);
    setAdminPanelOpen(false);
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
      // 1. Sign up in Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: details.email,
        password: details.password,
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
             return { success: false, messageKey: 'registrationFailed', errorDetail: 'Email already exists' }; 
        }
        throw signUpError;
      }

      if (data.user) {
        // 2. Create Profile Record
        // Check if any profiles exist to determine if this is the first user (Admin)
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const role: UserRole = (count === 0) ? '管理員' : '一般用戶';

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
            // Even if profile creation fails, the user is created in Auth. 
            // We should probably inform the user or handle this.
            // For now, return error so they see it.
            return { success: false, messageKey: 'registrationFailed', errorDetail: 'Profile DB Error: ' + profileError.message };
        }
        
        fetchUsers();
        return { success: true, messageKey: 'registrationSuccess' };
      }
      return { success: false, messageKey: 'registrationFailed', errorDetail: 'Unknown error during sign up' };

    } catch (error: any) {
      console.error("Registration error:", error);
      return { success: false, messageKey: 'registrationFailed', errorDetail: error.message };
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
      const targetUser = users.find(u => u.email === email);
      if (!targetUser) return { success: false, messageKey: 'userNotFound' };

      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (fetchError || !profileData) return { success: false, messageKey: 'userNotFound' };

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
      return { success: false, messageKey: 'userNotFound' };
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
    } catch (error) {
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
