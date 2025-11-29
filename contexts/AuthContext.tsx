
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../types';
import { INITIAL_USERS } from '../services/localDatabase';

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

const STORAGE_KEY_USERS = 'app_users_db_v1';
const STORAGE_KEY_CURRENT_USER = 'app_current_session_v1';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const [isAdminPanelOpen, setAdminPanelOpen] = useState(false);

  // --- 初始化：從 LocalStorage 讀取，若無則寫入內建資料庫 ---
  useEffect(() => {
    const initDatabase = () => {
      try {
        // 1. 載入使用者資料庫
        const storedUsers = localStorage.getItem(STORAGE_KEY_USERS);
        let loadedUsers: User[] = [];

        if (storedUsers) {
          loadedUsers = JSON.parse(storedUsers);
        } else {
          // 如果是第一次執行，寫入預設資料 (Embedded Database)
          loadedUsers = [...INITIAL_USERS];
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(loadedUsers));
        }
        setUsers(loadedUsers);

        // 2. 恢復登入狀態 (Session)
        const storedSession = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
        if (storedSession) {
          const sessionUser = JSON.parse(storedSession);
          // 確保 Session 中的使用者資料是最新的 (從 users 陣列中查找)
          const latestUser = loadedUsers.find(u => u.email === sessionUser.email);
          if (latestUser) {
            setCurrentUser(latestUser);
          } else {
            // 如果使用者已被刪除，清除 Session
            localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
          }
        }
      } catch (e) {
        console.error("Local database init failed:", e);
        // 發生嚴重錯誤時，強制重置為預設值
        setUsers(INITIAL_USERS);
      }
    };

    initDatabase();
  }, []);

  // --- 輔助函式：儲存到 LocalStorage ---
  const saveUsersToStorage = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(newUsers));
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    // 模擬網路延遲 (可選，讓使用者感覺有在運作)
    await new Promise(resolve => setTimeout(resolve, 300));

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      setLoginModalOpen(false);
      return { success: true };
    }

    // 特殊後門：如果資料庫壞了，允許 admin/admin 強制登入並修復
    if (email === 'admin@mazylab.com' && password === 'admin') {
        const rescueAdmin = INITIAL_USERS[0];
        // 檢查是否已存在，不存在則加回去
        if (!users.some(u => u.email === rescueAdmin.email)) {
            const newUsers = [rescueAdmin, ...users];
            saveUsersToStorage(newUsers);
            setCurrentUser(rescueAdmin);
            localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(rescueAdmin));
            setLoginModalOpen(false);
            return { success: true, message: '管理員帳號已自動修復並登入' };
        }
    }

    return { success: false, message: '電子郵件或密碼錯誤' };
  };

  const logout = async () => {
    setCurrentUser(null);
    setAdminPanelOpen(false);
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
  };

  const register = async (details: { email: string; password: string; name: string; phone: string; }): Promise<{ success: boolean; messageKey: string; errorDetail?: string }> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // 模擬

    if (users.some(u => u.email.toLowerCase() === details.email.toLowerCase())) {
      return { success: false, messageKey: 'registrationFailed', errorDetail: 'Email already exists' };
    }

    const newUser: User = { 
        ...details, 
        role: users.length === 0 ? '管理員' : '一般用戶' // 如果是第一個用戶，自動變管理員
    };
    
    const newUsers = [...users, newUser];
    saveUsersToStorage(newUsers);
    
    return { success: true, messageKey: 'registrationSuccess' };
  };

  const addUser = async (user: User): Promise<{ success: boolean; messageKey: string }> => {
    if (users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
        return { success: false, messageKey: 'registrationFailed' }; 
    }
    const newUsers = [...users, user];
    saveUsersToStorage(newUsers);
    return { success: true, messageKey: 'addUserSuccess' };
  };

  const updateUser = async (email: string, data: Partial<User>): Promise<{ success: boolean; messageKey: string }> => {
    const idx = users.findIndex(u => u.email === email);
    if (idx === -1) return { success: false, messageKey: 'userNotFound' };

    const updatedUser = { ...users[idx], ...data };
    // 移除 undefined 的欄位
    Object.keys(updatedUser).forEach(key => (updatedUser as any)[key] === undefined && delete (updatedUser as any)[key]);

    const newUsers = [...users];
    newUsers[idx] = updatedUser;
    
    saveUsersToStorage(newUsers);

    // 如果更新的是當前登入者，同步更新 Session
    if (currentUser?.email === email) {
        setCurrentUser(updatedUser);
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(updatedUser));
    }

    return { success: true, messageKey: 'updateUserSuccess' };
  };

  const deleteUser = async (email: string): Promise<{ success: boolean; messageKey: string }> => {
    if (currentUser?.email === email) return { success: false, messageKey: 'cannotDeleteSelf' };
    
    const newUsers = users.filter(u => u.email !== email);
    if (newUsers.length === users.length) return { success: false, messageKey: 'userNotFound' };
    
    saveUsersToStorage(newUsers);
    return { success: true, messageKey: 'deleteUserSuccess' };
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, login, logout, register, addUser, updateUser, deleteUser, isLoginModalOpen, setLoginModalOpen, isAdminPanelOpen, setAdminPanelOpen }}>
      {children}
    </AuthContext.Provider>
  );
};
