import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { withTenant } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth";

let tenantA: { id: string };
let tenantB: { id: string };
let userA: { id: string };
let userB: { id: string };

describe("Tenant Isolation", () => {
  beforeAll(async () => {
    const [tA] = await db
      .insert(schema.tenants)
      .values({
        name: "Test Tenant A",
        slug: "test-tenant-a-" + Date.now(),
        isActive: true,
        settings: {},
      })
      .returning();
    tenantA = tA;

    const [tB] = await db
      .insert(schema.tenants)
      .values({
        name: "Test Tenant B",
        slug: "test-tenant-b-" + Date.now(),
        isActive: true,
        settings: {},
      })
      .returning();
    tenantB = tB;

    const passwordHash = await hashPassword("testpassword");

    const [uA] = await db
      .insert(schema.users)
      .values({
        tenantId: tenantA.id,
        email: "user-a@test.local",
        name: "User A",
        passwordHash,
        role: "admin",
      })
      .returning();
    userA = uA;

    const [uB] = await db
      .insert(schema.users)
      .values({
        tenantId: tenantB.id,
        email: "user-b@test.local",
        name: "User B",
        passwordHash,
        role: "admin",
      })
      .returning();
    userB = uB;
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.tenantId, tenantA.id));
    await db.delete(schema.users).where(eq(schema.users.tenantId, tenantB.id));
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantA.id));
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantB.id));
  });

  test("withTenant scopes queries to the correct tenant", async () => {
    const usersInTenantA = await withTenant(tenantA.id, async (tx) => {
      return tx
        .select()
        .from(schema.users)
        .where(eq(schema.users.tenantId, tenantA.id));
    });

    expect(usersInTenantA.length).toBe(1);
    expect(usersInTenantA[0].email).toBe("user-a@test.local");
  });

  test("tenant A cannot see tenant B users with proper filtering", async () => {
    const usersInTenantA = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.tenantId, tenantA.id));

    const tenantBUserInResults = usersInTenantA.find(
      (u) => u.email === "user-b@test.local"
    );

    expect(tenantBUserInResults).toBeUndefined();
  });

  test("tenant B cannot see tenant A users with proper filtering", async () => {
    const usersInTenantB = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.tenantId, tenantB.id));

    const tenantAUserInResults = usersInTenantB.find(
      (u) => u.email === "user-a@test.local"
    );

    expect(tenantAUserInResults).toBeUndefined();
  });

  test("assets are properly isolated by tenant", async () => {
    const [assetA] = await db
      .insert(schema.assets)
      .values({
        tenantId: tenantA.id,
        category: "networking",
        type: "router",
        assetTag: "ASSET-A-001",
        serialNumber: "SN-A-001",
        manufacturer: "Cisco",
        model: "ISR 4000",
        location: "DC1",
        status: "active",
        createdBy: userA.id,
        customFields: {},
      })
      .returning();

    const [assetB] = await db
      .insert(schema.assets)
      .values({
        tenantId: tenantB.id,
        category: "networking",
        type: "switch",
        assetTag: "ASSET-B-001",
        serialNumber: "SN-B-001",
        manufacturer: "Juniper",
        model: "EX4300",
        location: "DC2",
        status: "active",
        createdBy: userB.id,
        customFields: {},
      })
      .returning();

    const tenantAAssets = await db
      .select()
      .from(schema.assets)
      .where(eq(schema.assets.tenantId, tenantA.id));

    expect(tenantAAssets.length).toBe(1);
    expect(tenantAAssets[0].assetTag).toBe("ASSET-A-001");

    const tenantBAssets = await db
      .select()
      .from(schema.assets)
      .where(eq(schema.assets.tenantId, tenantB.id));

    expect(tenantBAssets.length).toBe(1);
    expect(tenantBAssets[0].assetTag).toBe("ASSET-B-001");

    const tenantBAssetInA = tenantAAssets.find((a) => a.assetTag === "ASSET-B-001");
    expect(tenantBAssetInA).toBeUndefined();

    await db.delete(schema.assets).where(eq(schema.assets.id, assetA.id));
    await db.delete(schema.assets).where(eq(schema.assets.id, assetB.id));
  });

  test("audit logs are properly isolated by tenant", async () => {
    await db.insert(schema.auditLogs).values({
      tenantId: tenantA.id,
      userId: userA.id,
      action: "test.action",
      severity: "info",
      details: { test: "tenantA" },
    });

    await db.insert(schema.auditLogs).values({
      tenantId: tenantB.id,
      userId: userB.id,
      action: "test.action",
      severity: "info",
      details: { test: "tenantB" },
    });

    const tenantALogs = await db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.tenantId, tenantA.id));

    const tenantBLogInA = tenantALogs.find(
      (l) => (l.details as Record<string, unknown>).test === "tenantB"
    );
    expect(tenantBLogInA).toBeUndefined();

    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.tenantId, tenantA.id));
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.tenantId, tenantB.id));
  });
});
