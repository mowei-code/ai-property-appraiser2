
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';
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
    isPasswordRecoveryMode: boolean; // New Flag
    setIsPasswordRecoveryMode: (isRecovery: boolean) => void; // Allow manual clear
    setAdminPanelOpen: (isOpen: boolean) => void;
    addUser: (details: { email: string; password: string; role: UserRole; name: string; phone: string }) => Promise<AuthResult>;
    updateUser: (email: string, updates: Partial<User>) => Promise<AuthResult>;
    deleteUser: (email: string) => Promise<AuthResult>;
    refreshUsers: () => Promise<void>;
    forceReconnect: () => void;
    resetPassword: (email: string) => Promise<AuthResult>;
}

export const AuthContext = createContext<AuthContextType>(null!);

// 系統預設最高管理員 (可透過環境變數覆寫)
// @ts-ignore
const SYSTEM_ADMIN_EMAIL = (import.meta.env && import.meta.env.VITE_SYSTEM_ADMIN_EMAIL) || 'admin@mazylab.com';
console.log("[Auth] System Admin Email configured as:", SYSTEM_ADMIN_EMAIL);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoginModalOpen, setLoginModalOpen] = useState(false);
    const [isAdminPanelOpen, setAdminPanelOpen] = useState(false);
    // Double Check: Initialize state by checking URL immediately.
    // Supabase often puts 'type=recovery' in the hash, or we added 'reset=true' in the query.
    const [isPasswordRecoveryMode, setIsPasswordRecoveryMode] = useState(() => {
        const hash = window.location.hash;
        const search = window.location.search;
        const isRecovery = hash.includes('type=recovery') || search.includes('reset=true');
        if (isRecovery) {
            console.log("[Auth] Recovery Mode Detected via URL:", { hash, search });
        }
        return isRecovery;
    });

    // 從資料庫同步使用者 Profile
    const fetchProfile = useCallback(async (sessionUser: any) => {
        if (!sessionUser) return;

        const isSystemAdmin = sessionUser.email === SYSTEM_ADMIN_EMAIL;
        console.log(`[Auth] Fetching profile for: ${sessionUser.email}, Is System Admin? ${isSystemAdmin}`);

        try {
            // 1. 嘗試從資料庫讀取現有 Profile
            const { data: existingProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionUser.id)
                .maybeSingle();

            if (fetchError) {
                console.error("[Auth] Database fetch error:", fetchError.message);
                // 如果讀取失敗，但確認是系統管理員，仍強制給予管理員權限登入
                if (isSystemAdmin) {
                    setCurrentUser({
                        id: sessionUser.id,
                        email: sessionUser.email,
                        role: '管理員',
                        name: sessionUser.user_metadata?.name || 'System Admin',
                        phone: sessionUser.user_metadata?.phone || '',
                    });
                }
                return;
            }

            if (existingProfile) {
                // 2. 資料已存在
                let role = existingProfile.role as UserRole;

                // 【強制管理員權限】如果是 admin@mazylab.com，無論資料庫寫什麼，本地都視為管理員
                if (isSystemAdmin) {
                    if (role !== '管理員') {
                        console.warn("[Auth] System Admin found with incorrect DB role. Forcing local admin rights.");
                        // 嘗試在背景修復資料庫，但使用 catch 忽略錯誤，以免 RLS 阻擋導致登入失敗
                        supabase.from('profiles').update({ role: '管理員' }).eq('id', sessionUser.id)
                            .then(({ error }) => { if (error) console.warn("DB Role auto-fix failed (likely RLS), but ignored:", error.message); });
                    }
                    role = '管理員';
                }

                setCurrentUser({
                    id: existingProfile.id,
                    email: existingProfile.email,
                    role: role,
                    name: existingProfile.name,
                    phone: existingProfile.phone,
                    subscriptionExpiry: existingProfile.subscription_expiry
                });
            } else {
                // 3. 資料庫無此 Profile（新註冊），執行初始化寫入
                const newProfile = {
                    id: sessionUser.id,
                    email: sessionUser.email,
                    role: isSystemAdmin ? '管理員' : '一般用戶',
                    name: sessionUser.user_metadata?.name || '',
                    phone: sessionUser.user_metadata?.phone || '',
                    updated_at: new Date().toISOString()
                };

                // 使用 upsert，如果失敗則拋出錯誤讓外層 catch 處理
                const { error: insertError } = await supabase.from('profiles').upsert([newProfile]);
                if (insertError) throw insertError;

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
            // 發生嚴重錯誤時的最後防線：確保管理員不會被白畫面或錯誤訊息擋住
            setCurrentUser({
                id: sessionUser.id,
                email: sessionUser.email,
                role: isSystemAdmin ? '管理員' : '一般用戶',
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
        } catch (e) { console.error("Admin fetch users failed", e); }
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
                fetchProfile(session.user).catch(err => console.error("[Auth] Background profile fetch failed:", err));
            } else if (event === 'PASSWORD_RECOVERY') {
                console.log("[Auth] Password Recovery Event Detected!");
                setIsPasswordRecoveryMode(true);
                // Also fetch profile so currentUser is set (needed for updateUser)
                if (session?.user) fetchProfile(session.user);
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
                // Optimistic UI: Don't wait for profile. onAuthStateChange will handle it.
                setLoginModalOpen(false);
                return { success: true, messageKey: 'loginSuccess' };
            }
            return { success: false, messageKey: 'loginFailed', message: 'Unknown error' };
        } catch (e: any) {
            return { success: false, messageKey: 'loginFailed', message: e.message };
        }
    };

    const logout = async () => {
        // Instant UI feedback
        setCurrentUser(null);
        setUsers([]);
        setAdminPanelOpen(false);

        if (isSupabaseConfigured) {
            // Run in background, don't block
            supabase.auth.signOut().catch(console.error);
        }
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
                try {
                    await fetchProfile(data.user);
                } catch (e) {
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
        // Use import.meta.env directly to avoid circular dependency or import issues
        // @ts-ignore
        const sbUrl = import.meta.env.VITE_SUPABASE_URL;
        // @ts-ignore
        const sbKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!isSupabaseConfigured || !sbUrl || !sbKey) return { success: false, messageKey: 'registrationFailed', message: '未設定 Supabase 連線' };

        try {
            // 1. Create a temporary client to create the user without logging out the admin
            const tempClient = createClient(sbUrl, sbKey, {
                auth: {
                    persistSession: false, // Important: Don't persist this session
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            });

            // 2. Create the user in Auth
            const { data, error } = await tempClient.auth.signUp({
                email: details.email,
                password: details.password,
                options: { data: { name: details.name, phone: details.phone } }
            });

            if (error) {
                // Common error: "User already registered"
                if (error.message.includes('already registered')) {
                    return { success: false, messageKey: 'registrationFailed', message: '此 Email 已被註冊' };
                }
                return { success: false, messageKey: 'registrationFailed', message: error.message };
            }

            if (data.user) {
                // 3. Immediately insert profile using the *Admin's* client (which has permissions)
                const newProfile = {
                    id: data.user.id,
                    email: details.email,
                    role: details.role,
                    name: details.name,
                    phone: details.phone,
                    updated_at: new Date().toISOString()
                };

                const { error: profileError } = await supabase.from('profiles').upsert([newProfile]);

                if (profileError) {
                    console.warn("Profile creation warning during admin add:", profileError);
                }

                return { success: true, messageKey: 'addUserSuccess' };
            }
            return { success: false, messageKey: 'registrationFailed', message: 'Unknown error during user creation' };

        } catch (e: any) {
            return { success: false, messageKey: 'registrationFailed', message: e.message };
        }
    };

    const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
        if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };

        // @ts-ignore
        const sbUrl = import.meta.env.VITE_SUPABASE_URL;

        try {
            // 1. 獲取目標 User ID
            const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();

            if (!targetUser) {
                return { success: false, messageKey: 'userNotFound' };
            }

            // 2. 處理密碼更新 (Password Update Logic)
            if (updates.password && updates.password.trim() !== '') {
                const newPassword = updates.password.trim();

                // Scenario A: Updating own password
                if (currentUser?.email === email) {
                    const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
                    if (pwdError) {
                        return { success: false, messageKey: 'updateUserSuccess', message: '密碼更新失敗: ' + pwdError.message };
                    }
                }
                // Scenario B: Admin updating another user's password
                else if (currentUser?.role === '管理員') {
                    // SECURE: Use Backend/IPC for Admin Password Update to avoid exposing Service Key
                    try {
                        if (window.electronAPI) {
                            const result = await window.electronAPI.updatePassword({ email, password: newPassword });
                            if (!result.success) throw new Error(result.message);
                        } else {
                            const response = await fetch('/api/admin/update-password', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email, password: newPassword })
                            });

                            if (!response.ok) {
                                const errText = await response.text();
                                let errMsg = `Server error: ${response.status}`;
                                try { errMsg = JSON.parse(errText).message || errMsg; } catch { }
                                throw new Error(errMsg);
                            }
                        }
                    } catch (err: any) {
                        return { success: false, messageKey: 'updateUserSuccess', message: '管理員重設密碼失敗: ' + err.message };
                    }
                } else {
                    return { success: false, messageKey: 'updateUserSuccess', message: '權限不足，無法變更密碼' };
                }
            }

            // 3. 準備資料庫更新資料
            const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };

            // Map camelCase to snake_case for DB
            if ('subscriptionExpiry' in dbUpdates) {
                dbUpdates.subscription_expiry = dbUpdates.subscriptionExpiry;
                delete dbUpdates.subscriptionExpiry;
            }

            delete dbUpdates.id;
            delete dbUpdates.email;
            delete dbUpdates.password; // Important: Make sure password is NOT sent to profiles table

            // 4. 執行資料庫更新 (如果還有其他欄位要更新)
            if (Object.keys(dbUpdates).length > 0) {
                const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', targetUser.id);
                if (error) throw error;
            }

            // 5. 若更新的是自己，同步更新本地狀態
            if (currentUser?.email === email) {
                setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
            }

            // 6. 重新撈取列表 (若為管理員)
            if (currentUser?.role === '管理員') {
                await fetchUsers();
            }

            return { success: true, messageKey: 'updateUserSuccess' };
        } catch (e: any) {
            return { success: false, messageKey: 'operationFailed', message: '更新失敗: ' + e.message };
        }
    };

    const deleteUser = async (email: string): Promise<AuthResult> => {
        if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };

        // Safety Check 1: Prevent self-deletion
        if (currentUser?.email === email) {
            return { success: false, messageKey: 'deleteUserSuccess', message: '操作失敗：您無法刪除自己的管理員帳號。' };
        }

        // Safety Check 2: Prevent System Admin deletion
        if (email === SYSTEM_ADMIN_EMAIL) {
            return { success: false, messageKey: 'deleteUserSuccess', message: '操作失敗：無法刪除系統最高管理員。' };
        }

        try {
            // 1. Determine Environment (Electron vs Web)
            if (window.electronAPI) {
                console.log('[Auth] using Electron IPC for deleteUser');
                const result = await window.electronAPI.deleteUser({ email });
                if (!result.success) throw new Error(result.message);
            } else {
                console.log('[Auth] using Web API for deleteUser');
                const response = await fetch('/api/admin/delete-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    let errMsg = `Server error: ${response.status}`;
                    try { errMsg = JSON.parse(errText).message || errMsg; } catch { }
                    throw new Error(errMsg);
                }
            }

            // 2. Also ensure local profile is removed (Database)
            // Note: If the backend already cleaned up Auth, we should still clean up Profiles if not cascaded.
            // Our backend logic didn't explicitly delete Profile, so we do it here to be sure, 
            // OR we assume the refreshUsers check will eventually reflect it.
            // Let's do a safe delete here for immediate UI consistency.
            const { error } = await supabase.from('profiles').delete().eq('email', email);
            if (error) console.warn("Profile delete warning (might already be deleted):", error.message);

            await fetchUsers();
            return { success: true, messageKey: 'deleteUserSuccess', message: '使用者已完全刪除 (包含登入帳號)' };

        } catch (e: any) {
            console.error("Delete user failed:", e);
            return { success: false, messageKey: 'operationFailed', message: '刪除失敗: ' + e.message };
        }
    };

    const resetPassword = async (email: string): Promise<AuthResult> => {
        if (!isSupabaseConfigured) return { success: false, messageKey: 'loginFailed', message: '未設定 Supabase 連線' };

        try {
            // Priority: Custom Admin SMTP logic via Backend/IPC (Electron only)
            if (window.electronAPI) {
                const result = await window.electronAPI.resetPassword({ email });
                if (!result.success) throw new Error(result.message);
                return { success: true, messageKey: 'resetPasswordSuccess', message: '重設密碼信件已發送 (Desktop)。' };
            }

            // Web Environment: Use Standard Supabase Reset (Phase 1 Logic)
            // We remove the explicit 'redirectTo' to fallback to the Default Site URL configured in Supabase.
            // This avoids "Link Invalid" errors if the whitelist is missing specific paths.
            const { error } = await supabase.auth.resetPasswordForEmail(email);

            if (error) {
                // If frequent "Rate Limit" errors occur, it means Supabase protection is active.
                throw error;
            }

            return { success: true, messageKey: 'resetPasswordSuccess', message: '重設密碼信件已發送！請檢查您的信箱。' };

        } catch (e: any) {
            console.error("Reset password failed:", e);
            return { success: false, messageKey: 'resetPasswordFailed', message: e.message || '發送失敗，請稍後再試。' };
        }
    };

    return (
        <AuthContext.Provider value={{
            currentUser, users, login, logout, register,
            isLoginModalOpen, setLoginModalOpen,
            isPasswordRecoveryMode, setIsPasswordRecoveryMode,
            isAdminPanelOpen, setAdminPanelOpen,
            addUser, updateUser, deleteUser,
            refreshUsers: fetchUsers, forceReconnect,
            resetPassword
        }}>
            {children}
        </AuthContext.Provider>
    );
};
