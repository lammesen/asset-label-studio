import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  assets: {
    all: ["assets"] as const,
    lists: () => [...queryKeys.assets.all, "list"] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.assets.lists(), filters] as const,
    details: () => [...queryKeys.assets.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.assets.details(), id] as const,
    stats: () => [...queryKeys.assets.all, "stats"] as const,
  },
  templates: {
    all: ["templates"] as const,
    lists: () => [...queryKeys.templates.all, "list"] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.templates.lists(), filters] as const,
    details: () => [...queryKeys.templates.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.templates.details(), id] as const,
    versions: (id: string) => [...queryKeys.templates.detail(id), "versions"] as const,
    version: (id: string, version: number) => [...queryKeys.templates.versions(id), version] as const,
  },
  users: {
    all: ["users"] as const,
    lists: () => [...queryKeys.users.all, "list"] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  print: {
    all: ["print"] as const,
    jobs: () => [...queryKeys.print.all, "jobs"] as const,
    jobList: (filters: Record<string, unknown>) => [...queryKeys.print.jobs(), filters] as const,
    job: (id: string) => [...queryKeys.print.jobs(), id] as const,
    jobItems: (id: string) => [...queryKeys.print.job(id), "items"] as const,
  },
  auth: {
    me: ["auth", "me"] as const,
  },
} as const;
