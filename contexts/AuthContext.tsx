
import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
    forceReconnect: () => void;
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
                await fetchProfile(session.user);
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
        return { success: false, messageKey: 'registrationFailed', message: '請登出後使用註冊功能建立新帳號，或透過 Supabase 後台新增。' };
    };

    const updateUser = async (email: string, updates: Partial<User>): Promise<AuthResult> => {
        if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };
        try {
            // 1. 獲取目標 User ID
            const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();

            if (!targetUser) {
                return { success: false, messageKey: 'userNotFound' };
            }

            // 2. 準備更新資料
            const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };

            // Map camelCase to snake_case for DB
            if ('subscriptionExpiry' in dbUpdates) {
                dbUpdates.subscription_expiry = dbUpdates.subscriptionExpiry;
                delete dbUpdates.subscriptionExpiry;
            }

            delete dbUpdates.id;
            delete dbUpdates.email;
            delete dbUpdates.password;

            // 3. 執行更新
            const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', targetUser.id);
            if (error) throw error;

            // 4. 若更新的是自己，同步更新本地狀態
            if (currentUser?.email === email) {
                setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
            }

            // 5. 重新撈取列表 (若為管理員)
            if (currentUser?.role === '管理員') {
                await fetchUsers();
            }

            return { success: true, messageKey: 'updateUserSuccess' };
        } catch (e: any) {
            return { success: false, messageKey: 'updateUserSuccess', message: e.message };
        }
    };

    const deleteUser = async (email: string): Promise<AuthResult> => {
        if (!isSupabaseConfigured) return { success: false, messageKey: 'userNotFound' };
        try {
            const { error } = await supabase.from('profiles').delete().eq('email', email);
            if (error) throw error;

            await fetchUsers();
            return { success: true, messageKey: 'deleteUserSuccess', message: '資料已清除 (Supabase Auth 帳號需至後台刪除)' };
        } catch (e: any) {
            return { success: false, messageKey: 'deleteUserSuccess', message: e.message };
        }
    };

    return (
        <AuthContext.Provider value={{
            currentUser, users, login, logout, register,
            isLoginModalOpen, setLoginModalOpen,
            isAdminPanelOpen, setAdminPanelOpen,
            addUser, updateUser, deleteUser,
            refreshUsers: fetchUsers, forceReconnect
        }}>
            {children}
        </AuthContext.Provider>
    );
};
