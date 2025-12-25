import { useState, useEffect, useCallback } from "react";

import type { Permission, Role } from "@/types/permissions";

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug: string;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    permissions: [],
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setState({
          user: data.user,
          permissions: data.permissions,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({
          user: null,
          permissions: [],
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch {
      setState({
        user: null,
        permissions: [],
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (response.ok) {
        await checkAuth();
        return { success: true };
      }

      const data = await response.json();
      return { success: false, error: data.error ?? "Login failed" };
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setState({
        user: null,
        permissions: [],
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    return state.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some((p) => state.permissions.includes(p));
  };

  return {
    ...state,
    login,
    logout,
    checkAuth,
    hasPermission,
    hasAnyPermission,
  };
}
