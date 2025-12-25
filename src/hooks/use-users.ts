import { useState, useCallback } from "react";

import type { Role } from "@/types/permissions";

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserListResult {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

interface UserFilters {
  role?: Role;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
}

interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: Role;
  isActive?: boolean;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function useUsers() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listUsers = useCallback(async (filters: UserFilters = {}): Promise<UserListResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.set(key, String(value));
        }
      });

      const response = await fetch(`/api/users?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to fetch users");
        return null;
      }

      return await response.json();
    } catch {
      setError("Network error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUser = useCallback(async (id: string): Promise<User | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to fetch user");
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch {
      setError("Network error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createUser = useCallback(async (input: CreateUserInput): Promise<User | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to create user");
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch {
      setError("Network error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (id: string, input: UpdateUserInput): Promise<User | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to update user");
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch {
      setError("Network error");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to delete user");
        return false;
      }

      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (input: ChangePasswordInput): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Failed to change password");
        return false;
      }

      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
  };
}
