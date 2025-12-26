import { useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserX,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useUsers } from "@/hooks/use-users";
import { cn } from "@/lib/utils";
import { ROLES, type Role } from "@/types/permissions";

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserFormData {
  email: string;
  name: string;
  password: string;
  role: Role;
  isActive: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  user: "User",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-red-100 text-red-800 hover:bg-red-100",
  manager: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  user: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  viewer: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

const INITIAL_FORM_DATA: UserFormData = {
  email: "",
  name: "",
  password: "",
  role: "user",
  isActive: true,
};

const PAGE_SIZE = 10;

export function UserManagement() {
  const { listUsers, createUser, updateUser, deleteUser, isLoading, error } = useUsers();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    const result = await listUsers({
      search: debouncedSearch || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      isActive: activeFilter === "all" ? undefined : activeFilter === "active",
      page,
      pageSize: PAGE_SIZE,
    });

    if (result) {
      setUsers(result.users);
      setTotal(result.total);
    }
  }, [listUsers, debouncedSearch, roleFilter, activeFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function openCreateDialog() {
    setEditingUser(null);
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
    setIsDialogOpen(true);
  }

  function openEditDialog(user: User) {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: "",
      role: user.role,
      isActive: user.isActive,
    });
    setFormErrors({});
    setIsDialogOpen(true);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email address";
    }
    if (!editingUser && !formData.password) {
      errors.password = "Password is required";
    } else if (!editingUser && formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) return;

    if (editingUser) {
      const updateInput: { email?: string; name?: string; role?: Role; isActive?: boolean } = {};
      if (formData.email !== editingUser.email) updateInput.email = formData.email;
      if (formData.name !== editingUser.name) updateInput.name = formData.name;
      if (formData.role !== editingUser.role) updateInput.role = formData.role;
      if (formData.isActive !== editingUser.isActive) updateInput.isActive = formData.isActive;

      const result = await updateUser(editingUser.id, updateInput);
      if (result) {
        setIsDialogOpen(false);
        fetchUsers();
      }
    } else {
      const result = await createUser({
        email: formData.email.trim(),
        name: formData.name.trim(),
        password: formData.password,
        role: formData.role,
      });
      if (result) {
        setIsDialogOpen(false);
        fetchUsers();
      }
    }
  }

  async function handleDelete() {
    if (!deleteConfirmUser) return;

    const success = await deleteUser(deleteConfirmUser.id);
    if (success) {
      setDeleteConfirmUser(null);
      fetchUsers();
    }
  }

  function canEditUser(user: User): boolean {
    if (user.id === currentUser?.id) return true;
    if (currentUser?.role === "admin") return true;
    return false;
  }

  function canDeleteUser(user: User): boolean {
    if (user.id === currentUser?.id) return false;
    if (currentUser?.role === "admin") return true;
    return false;
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (error && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Failed to load users</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchUsers}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value as Role | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.values(ROLES).map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={activeFilter}
            onValueChange={(value) => {
              setActiveFilter(value as "all" | "active" | "inactive");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={openCreateDialog} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border">
        {isLoading && users.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              {search || roleFilter !== "all" || activeFilter !== "all" ? (
                <UserX className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Users className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search || roleFilter !== "all" || activeFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Get started by adding your first user"}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name}
                      {user.id === currentUser?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-normal", ROLE_COLORS[user.role])}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            user.isActive ? "bg-green-500" : "bg-gray-400"
                          )}
                        />
                        <span className="text-sm">{user.isActive ? "Active" : "Inactive"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {formatDate(user.lastLoginAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canEditUser(user) && (
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)} aria-label={`Edit ${user.name}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteUser(user) && (
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmUser(user)} aria-label={`Delete ${user.name}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} users
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update the user information below."
                : "Fill in the details to create a new user."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className={cn(formErrors.name && "border-destructive")}
              />
              {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className={cn(formErrors.email && "border-destructive")}
              />
              {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className={cn(formErrors.password && "border-destructive")}
                />
                {formErrors.password && <p className="text-sm text-destructive">{formErrors.password}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value as Role }))}
                disabled={editingUser?.id === currentUser?.id}
              >
                <SelectTrigger className={cn(editingUser?.id === currentUser?.id && "opacity-50")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ROLES).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingUser?.id === currentUser?.id && (
                <p className="text-sm text-muted-foreground">You cannot change your own role</p>
              )}
            </div>

            {editingUser && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked === true }))}
                  disabled={editingUser?.id === currentUser?.id}
                />
                <Label htmlFor="isActive" className="font-normal cursor-pointer">
                  User is active
                </Label>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteConfirmUser)} onOpenChange={() => setDeleteConfirmUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteConfirmUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmUser(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Deleting..." : "Delete User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
