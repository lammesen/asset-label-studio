import { db, schema } from "@/db";
import { eq, and, or, ilike, desc, count } from "drizzle-orm";

import type { TenantContext } from "@/types/tenant";
import type { User } from "@/types/user";
import type { Role } from "@/types/permissions";
import type { CreateUserInput, UpdateUserInput, UserFiltersInput, ChangePasswordInput } from "@/lib/validations";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createAuditLog } from "./audit-service";
import { AUDIT_ACTIONS } from "@/types/audit";

function mapRowToUser(row: typeof schema.users.$inferSelect): User {
  return {
    id: row.id,
    tenantId: row.tenantId,
    email: row.email,
    name: row.name,
    role: row.role as Role,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createUser(
  ctx: TenantContext,
  input: CreateUserInput
): Promise<User> {
  const passwordHash = await hashPassword(input.password);

  const [row] = await db
    .insert(schema.users)
    .values({
      tenantId: ctx.tenantId,
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash,
      role: input.role,
    })
    .returning();

  await createAuditLog(ctx, {
    action: AUDIT_ACTIONS.USER_CREATED,
    resourceType: "user",
    resourceId: row.id,
    details: { email: input.email, role: input.role },
  });

  return mapRowToUser(row);
}

export async function getUserById(
  ctx: TenantContext,
  userId: string
): Promise<User | null> {
  const [row] = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, userId),
        eq(schema.users.tenantId, ctx.tenantId)
      )
    )
    .limit(1);

  return row ? mapRowToUser(row) : null;
}

export async function updateUser(
  ctx: TenantContext,
  userId: string,
  input: UpdateUserInput
): Promise<User | null> {
  const existing = await getUserById(ctx, userId);
  if (!existing) return null;

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.email !== undefined) updateData.email = input.email.toLowerCase();
  if (input.name !== undefined) updateData.name = input.name;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  const [row] = await db
    .update(schema.users)
    .set(updateData)
    .where(
      and(
        eq(schema.users.id, userId),
        eq(schema.users.tenantId, ctx.tenantId)
      )
    )
    .returning();

  if (!row) return null;

  const roleChanged = input.role && input.role !== existing.role;
  await createAuditLog(ctx, {
    action: roleChanged ? AUDIT_ACTIONS.USER_ROLE_CHANGED : AUDIT_ACTIONS.USER_UPDATED,
    resourceType: "user",
    resourceId: userId,
    details: roleChanged
      ? { oldRole: existing.role, newRole: input.role }
      : { fields: Object.keys(input) },
  });

  return mapRowToUser(row);
}

export async function deleteUser(
  ctx: TenantContext,
  userId: string
): Promise<boolean> {
  if (userId === ctx.userId) {
    throw new Error("Cannot delete your own account");
  }

  const existing = await getUserById(ctx, userId);
  if (!existing) return false;

  await db
    .delete(schema.users)
    .where(
      and(
        eq(schema.users.id, userId),
        eq(schema.users.tenantId, ctx.tenantId)
      )
    );

  await createAuditLog(ctx, {
    action: AUDIT_ACTIONS.USER_DELETED,
    resourceType: "user",
    resourceId: userId,
    details: { email: existing.email },
  });

  return true;
}

export async function changePassword(
  ctx: TenantContext,
  input: ChangePasswordInput
): Promise<boolean> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, ctx.userId),
        eq(schema.users.tenantId, ctx.tenantId)
      )
    )
    .limit(1);

  if (!user) return false;

  const validPassword = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!validPassword) return false;

  const newPasswordHash = await hashPassword(input.newPassword);

  await db
    .update(schema.users)
    .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
    .where(eq(schema.users.id, ctx.userId));

  await createAuditLog(ctx, {
    action: AUDIT_ACTIONS.PASSWORD_CHANGED,
    resourceType: "user",
    resourceId: ctx.userId,
  });

  return true;
}

export async function listUsers(
  ctx: TenantContext,
  filters: UserFiltersInput
): Promise<{ users: User[]; total: number; page: number; pageSize: number }> {
  const conditions = [eq(schema.users.tenantId, ctx.tenantId)];

  if (filters.role) {
    conditions.push(eq(schema.users.role, filters.role));
  }
  if (filters.isActive !== undefined) {
    conditions.push(eq(schema.users.isActive, filters.isActive));
  }
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(schema.users.email, searchTerm),
        ilike(schema.users.name, searchTerm)
      )!
    );
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(schema.users)
      .where(and(...conditions))
      .orderBy(desc(schema.users.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(schema.users)
      .where(and(...conditions)),
  ]);

  return {
    users: rows.map(mapRowToUser),
    total: countResult[0]?.total ?? 0,
    page,
    pageSize,
  };
}
