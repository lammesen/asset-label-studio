import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-client";
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

async function fetchUsers(filters: UserFilters): Promise<UserListResult> {
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
    throw new Error(data.error ?? "Failed to fetch users");
  }

  return response.json();
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to fetch user");
  }

  const data = await response.json();
  return data.user;
}

async function createUserApi(input: CreateUserInput): Promise<User> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to create user");
  }

  const data = await response.json();
  return data.user;
}

async function updateUserApi(id: string, input: UpdateUserInput): Promise<User> {
  const response = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to update user");
  }

  const data = await response.json();
  return data.user;
}

async function deleteUserApi(id: string): Promise<void> {
  const response = await fetch(`/api/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to delete user");
  }
}

async function changePasswordApi(input: ChangePasswordInput): Promise<void> {
  const response = await fetch("/api/auth/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Failed to change password");
  }
}

export function useUserList(filters: UserFilters = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(filters as Record<string, unknown>),
    queryFn: () => fetchUsers(filters),
  });
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: queryKeys.users.detail(id ?? ""),
    queryFn: () => fetchUser(id!),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      updateUserApi(id, input),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
      queryClient.setQueryData(queryKeys.users.detail(updatedUser.id), updatedUser);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePasswordApi,
  });
}

export function useUsers() {
  const queryClient = useQueryClient();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const passwordMutation = useChangePassword();

  return {
    isLoading: createMutation.isPending || updateMutation.isPending,
    error: createMutation.error?.message || updateMutation.error?.message || null,

    listUsers: async (filters: UserFilters = {}): Promise<UserListResult | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: queryKeys.users.list(filters as Record<string, unknown>),
          queryFn: () => fetchUsers(filters),
        });
      } catch {
        return null;
      }
    },

    getUser: async (id: string): Promise<User | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: queryKeys.users.detail(id),
          queryFn: () => fetchUser(id),
        });
      } catch {
        return null;
      }
    },

    createUser: async (input: CreateUserInput): Promise<User | null> => {
      try {
        return await createMutation.mutateAsync(input);
      } catch {
        return null;
      }
    },

    updateUser: async (id: string, input: UpdateUserInput): Promise<User | null> => {
      try {
        return await updateMutation.mutateAsync({ id, input });
      } catch {
        return null;
      }
    },

    deleteUser: async (id: string): Promise<boolean> => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },

    changePassword: async (input: ChangePasswordInput): Promise<boolean> => {
      try {
        await passwordMutation.mutateAsync(input);
        return true;
      } catch {
        return false;
      }
    },

    invalidateUsers: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  };
}
