import { withAuth } from "@/api/middleware/auth";
import { requirePermission } from "@/api/middleware/permissions";
import { createUserSchema, updateUserSchema, changePasswordSchema, userFiltersSchema } from "@/lib/validations";
import { createUser, getUserById, updateUser, deleteUser, changePassword, listUsers } from "@/services/user-service";
import { PERMISSIONS } from "@/types/permissions";

import type { TenantContext } from "@/types/tenant";

export const handleListUsers = withAuth(
  requirePermission(PERMISSIONS.USER_READ, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const params = Object.fromEntries(url.searchParams);
      const parsed = userFiltersSchema.safeParse(params);

      if (!parsed.success) {
        return Response.json(
          { error: "Invalid filters", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const result = await listUsers(ctx, parsed.data);
      return Response.json(result);
    } catch (error) {
      console.error("List users error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleGetUser = withAuth(
  requirePermission(PERMISSIONS.USER_READ, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const userId = url.pathname.split("/").pop();

      if (!userId) {
        return Response.json({ error: "User ID required" }, { status: 400 });
      }

      const user = await getUserById(ctx, userId);
      if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }

      return Response.json({ user });
    } catch (error) {
      console.error("Get user error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleCreateUser = withAuth(
  requirePermission(PERMISSIONS.USER_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const body = await req.json();
      const parsed = createUserSchema.safeParse(body);

      if (!parsed.success) {
        return Response.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const user = await createUser(ctx, parsed.data);
      return Response.json({ user }, { status: 201 });
    } catch (error) {
      console.error("Create user error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleUpdateUser = withAuth(
  requirePermission(PERMISSIONS.USER_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const userId = url.pathname.split("/").pop();

      if (!userId) {
        return Response.json({ error: "User ID required" }, { status: 400 });
      }

      const body = await req.json();
      const parsed = updateUserSchema.safeParse(body);

      if (!parsed.success) {
        return Response.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const user = await updateUser(ctx, userId, parsed.data);
      if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }

      return Response.json({ user });
    } catch (error) {
      console.error("Update user error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleDeleteUser = withAuth(
  requirePermission(PERMISSIONS.USER_MANAGE, async (req: Request, ctx: TenantContext) => {
    try {
      const url = new URL(req.url);
      const userId = url.pathname.split("/").pop();

      if (!userId) {
        return Response.json({ error: "User ID required" }, { status: 400 });
      }

      const deleted = await deleteUser(ctx, userId);
      if (!deleted) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }

      return Response.json({ success: true });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "Cannot delete your own account") {
        return Response.json({ error: error.message }, { status: 400 });
      }
      console.error("Delete user error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  })
);

export const handleChangePassword = withAuth(
  async (req: Request, ctx: TenantContext) => {
    try {
      const body = await req.json();
      const parsed = changePasswordSchema.safeParse(body);

      if (!parsed.success) {
        return Response.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const success = await changePassword(ctx, parsed.data);
      if (!success) {
        return Response.json({ error: "Current password is incorrect" }, { status: 400 });
      }

      return Response.json({ success: true });
    } catch (error) {
      console.error("Change password error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  }
);
