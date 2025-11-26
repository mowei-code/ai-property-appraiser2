
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  register: (details: { email: string; password: string; name: string; phone: string; }) => { success: boolean; messageKey: string };
  addUser: (user: User) => { success: boolean; messageKey: string };
  updateUser: (email: string, data: Partial<User>) => { success: boolean; messageKey: string };
  deleteUser: (email: string) => { success: boolean; messageKey: string };
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

  // Load users and session from localStorage on initial load
  useEffect(() => {
    try {
      const storedUsers = localStorage.getItem('app_users');
      let parsedUsers: User[] = [];

      if (storedUsers) {
        parsedUsers = JSON.parse(storedUsers);
      } else {
        // Seed initial admin user if no users exist
        const adminUser: User = { email: 'admin@mazylab.com', password: 'admin123', role: '管理員', name: 'Admin', phone: '0912345678' };
        parsedUsers = [adminUser];
        localStorage.setItem('app_users', JSON.stringify(parsedUsers));
      }

      // Check for subscription expiration
      const now = new Date();
      let hasUpdates = false;
      const updatedUsers = parsedUsers.map(user => {
          if (user.role === '付費用戶' && user.subscriptionExpiry) {
              const expiryDate = new Date(user.subscriptionExpiry);
              if (expiryDate < now) {
                  // Subscription expired, downgrade to General User
                  hasUpdates = true;
                  return { ...user, role: '一般用戶' as UserRole, subscriptionExpiry: null };
              }
          }
          return user;
      });

      if (hasUpdates) {
          setUsers(updatedUsers);
          localStorage.setItem('app_users', JSON.stringify(updatedUsers));
      } else {
          setUsers(parsedUsers);
      }

      const storedSession = localStorage.getItem('app_session');
      if (storedSession) {
        const loggedInUser = JSON.parse(storedSession);
        // We need to find the full user object from the (potentially updated) users list
        const fullUser = updatedUsers.find((u: User) => u.email === loggedInUser.email);
        if (fullUser) {
          setCurrentUser(fullUser);
        } else {
            // If user in session no longer exists in DB, clear session
            localStorage.removeItem('app_session');
        }
      }
    } catch (error) {
      console.error("Failed to parse from localStorage", error);
    }
  }, []);

  const login = (email: string, password: string): boolean => {
    // Refresh users from state to ensure latest data
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('app_session', JSON.stringify(user));
      setLoginModalOpen(false);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('app_session');
  };

  const register = (details: { email: string; password: string; name: string; phone: string; }): { success: boolean; messageKey: string } => {
    if (users.some(u => u.email === details.email)) {
      return { success: false, messageKey: 'registrationFailed' };
    }
    if (!details.name.trim()) {
        return { success: false, messageKey: 'missingRequiredFields' };
    }
    if (!details.phone.trim()) {
        return { success: false, messageKey: 'missingRequiredFields' };
    }

    const newUser: User = { 
        email: details.email, 
        password: details.password, 
        role: '一般用戶', // Default all new users to 'General Member'
        name: details.name,
        phone: details.phone
    };
    
    setUsers(prevUsers => {
        const updatedUsers = [...prevUsers, newUser];
        localStorage.setItem('app_users', JSON.stringify(updatedUsers));
        return updatedUsers;
    });
    
    return { success: true, messageKey: 'registrationSuccess' };
  };

  const addUser = (user: User): { success: boolean; messageKey: string } => {
    if (users.some(u => u.email === user.email)) {
      return { success: false, messageKey: 'registrationFailed' };
    }
    if (!user.password || user.password.length < 6) {
        return { success: false, messageKey: 'passwordMinLength' };
    }
    if (!user.name || !user.phone) {
      return { success: false, messageKey: 'missingRequiredFields' };
    }
    
    setUsers(prevUsers => {
        const updatedUsers = [...prevUsers, user];
        localStorage.setItem('app_users', JSON.stringify(updatedUsers));
        return updatedUsers;
    });

    return { success: true, messageKey: 'addUserSuccess' };
  };

  const updateUser = (email: string, data: Partial<User>): { success: boolean; messageKey: string } => {
    let updatedUsers = [...users];
    const userIndex = updatedUsers.findIndex(u => u.email === email);
    if (userIndex === -1) {
        return { success: false, messageKey: 'userNotFound' };
    }

    // Prevent admin from removing their own admin rights if they are the only admin
    const adminCount = users.filter(u => u.role === '管理員').length;
    if (currentUser?.email === email && data.role && data.role !== '管理員' && adminCount <= 1) {
      return { success: false, messageKey: 'cannotDeleteLastAdmin' };
    }
    
    // If password is being updated, check its length
    if (data.password && data.password.length > 0 && data.password.length < 6) {
        return { success: false, messageKey: 'passwordMinLength' };
    }

    const updatedUser = { ...updatedUsers[userIndex], ...data };
    // If password field is empty string, keep the old password
    if (data.password === '') {
        delete updatedUser.password;
    }
    
    // Auto-handle subscription expiry when role changes manually
    if (data.role === '一般用戶' && updatedUsers[userIndex].role === '付費用戶') {
        updatedUser.subscriptionExpiry = null;
    }

    updatedUsers[userIndex] = updatedUser;

    setUsers(updatedUsers);
    localStorage.setItem('app_users', JSON.stringify(updatedUsers));

    // If the currently logged-in user is the one being updated, refresh their session
    if (currentUser?.email === email) {
        setCurrentUser(updatedUser);
        localStorage.setItem('app_session', JSON.stringify(updatedUser));
    }

    return { success: true, messageKey: 'updateUserSuccess' };
  };

  const deleteUser = (email: string): { success: boolean; messageKey: string } => {
    const targetEmail = email.trim();

    // Prevent deleting the currently logged-in user
    if (currentUser?.email === targetEmail) {
      return { success: false, messageKey: 'cannotDeleteSelf' };
    }

    // Check if user exists in the current state (from closure)
    const userToDelete = users.find(u => u.email === targetEmail);
    if (!userToDelete) {
        return { success: false, messageKey: 'userNotFound' };
    }

    // Prevent deleting the last admin
    const adminCount = users.filter(u => u.role === '管理員').length;
    if (userToDelete.role === '管理員' && adminCount <= 1) {
      return { success: false, messageKey: 'cannotDeleteLastAdmin' };
    }

    // Use functional update to ensure we are filtering from the absolute latest state
    setUsers(prevUsers => {
        const updatedUsers = prevUsers.filter(u => u.email !== targetEmail);
        // Side effect: persist to local storage
        localStorage.setItem('app_users', JSON.stringify(updatedUsers));
        return updatedUsers;
    });
    
    return { success: true, messageKey: 'deleteUserSuccess' };
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
