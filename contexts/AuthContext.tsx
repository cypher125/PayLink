"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getTokens, 
  setTokens, 
  removeTokens as clearTokens,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getProfile,
  UserProfile,
  LoginCredentials,
  RegisterData,
} from '@/lib/api';


interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUserProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUserProfile = async (): Promise<UserProfile | null> => {
    try {
      const userProfile = await getProfile();
      setUser(userProfile);
      return userProfile;
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
      return null;
    }
  };

  // Check for token and get user data on initial load
  useEffect(() => {
    const initAuth = async () => {
      const tokens = getTokens();
      if (tokens) {
        try {
          const userProfile = await getProfile();
          setUser(userProfile);
          
          // Set PIN status cookie based on user profile
          if (userProfile.has_pin) {
            document.cookie = `pin_set=true; path=/; SameSite=Lax`;
          } else {
            // Ensure pin_set is false if user doesn't have a PIN
            document.cookie = `pin_set=false; path=/; SameSite=Lax`;
          }
        } catch (error) {
          console.error('Failed to get user profile:', error);
          clearTokens();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; message: string }> => {
    try {
      const data = await apiLogin(credentials);
      
      if (data) {
        // Store tokens in localStorage via the setTokens function
        setTokens(data.tokens);
        
        // Also set the access token in a cookie for the middleware
        document.cookie = `access_token=${data.tokens.access}; path=/; SameSite=Lax`;
        
        // If user has a PIN, set pin_set cookie
        if (data.user && data.user.has_pin) {
          document.cookie = `pin_set=true; path=/; SameSite=Lax`;
        }
        
        // Set the user in state
        setUser(data.user);
        
        // Return success and let the component handle toast and navigation
        return {
          success: true,
          message: "Login successful"
        };
      }
      
      return {
        success: false,
        message: "Login failed. Please check your credentials."
      };
    } catch (unknownError: unknown) {
      console.error('Login error:', unknownError);
      const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
      return {
        success: false,
        message: error.message || "An unexpected error occurred"
      };
    }
  };

  const register = async (userData: RegisterData): Promise<{ success: boolean; message: string }> => {
    try {
      const data = await apiRegister(userData);
      
      if (data) {
        // Store tokens in localStorage
        setTokens(data.tokens);
        
        // Set the access token in a cookie for the middleware
        document.cookie = `access_token=${data.tokens.access}; path=/; SameSite=Lax`;
        
        // New users won't have a PIN yet, so don't set the pin_set cookie
        
        // Set the user in state
        setUser(data.user);
        
        // Return success and let the component handle toast and navigation
        return {
          success: true,
          message: "Registration successful"
        };
      }
      
      return {
        success: false,
        message: "Registration failed. Please try again."
      };
    } catch (unknownError: unknown) {
      console.error('Registration error:', unknownError);
      const error = unknownError instanceof Error ? unknownError : new Error(String(unknownError));
      return {
        success: false,
        message: error.message || "An unexpected error occurred"
      };
    }
  };

  const logout = () => {
    // Call the API but handle notifications in the component
    apiLogout();
    
    // Clean up state
    setUser(null);
    
    // Clear tokens from localStorage
    clearTokens();
    
    // Clear the access token cookie with proper expires parameter
    document.cookie = `access_token=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    
    // Use direct window location navigation for a cleaner logout
    window.location.href = '/auth/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Authentication route protector
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthProtected(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/login');
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return <div>Loading...</div>; // Replace with your loading component
    }

    return isAuthenticated ? <Component {...props} /> : null;
  };
}
