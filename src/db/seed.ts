import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import { hashPassword } from "@/lib/auth";
import { DEFAULT_TENANT_SETTINGS } from "@/types/tenant";
import type { LabelSpec } from "@/types/label-spec";
import type { EquipmentCategory } from "@/types/asset";

function createCategoryTemplate(
  name: string,
  category: EquipmentCategory | null,
  fields: Array<{ source: string; type: "text" | "qrcode" | "barcode"; x: number; y: number; w: number; h: number }>
): LabelSpec {
  return {
    id: crypto.randomUUID(),
    version: "1.0.0",
    name,
    dimensions: { width: 66.7, height: 25.4, unit: "mm" },
    dpi: 300,
    margins: { top: 2, right: 2, bottom: 2, left: 2 },
    fields: fields.map((f) => ({
      id: crypto.randomUUID(),
      type: f.type,
      source: f.source,
      position: { x: f.x, y: f.y },
      size: { width: f.w, height: f.h },
      style: f.type === "text"
        ? { fontFamily: "Arial", fontSize: 8, fontWeight: "normal" as const, fontStyle: "normal" as const, color: "#000000", textAlign: "left" as const, verticalAlign: "top" as const }
        : f.type === "qrcode"
        ? { errorCorrectionLevel: "M" as const, margin: 1, darkColor: "#000000", lightColor: "#ffffff" }
        : { format: "CODE128" as const, displayValue: true, fontSize: 8, textAlign: "center" as const, background: "#ffffff", lineColor: "#000000", width: 2, height: 8 },
    })),
    elements: [
      {
        id: crypto.randomUUID(),
        type: "line",
        position: { x: 2, y: 12 },
        size: { width: 62, height: 0.5 },
        style: { stroke: "#e5e7eb", strokeWidth: 0.3 },
      },
    ],
  };
}

const CATEGORY_TEMPLATES: Array<{
  name: string;
  description: string;
  category: EquipmentCategory | null;
  fields: Array<{ source: string; type: "text" | "qrcode" | "barcode"; x: number; y: number; w: number; h: number }>;
}> = [
  {
    name: "Universal Asset Label",
    description: "General-purpose label for any asset type",
    category: null,
    fields: [
      { source: "assetTag", type: "text", x: 2, y: 2, w: 40, h: 5 },
      { source: "serialNumber", type: "text", x: 2, y: 7, w: 40, h: 4 },
      { source: "assetTag", type: "qrcode", x: 48, y: 2, w: 16, h: 10 },
      { source: "manufacturer", type: "text", x: 2, y: 14, w: 30, h: 4 },
      { source: "model", type: "text", x: 2, y: 18, w: 30, h: 4 },
      { source: "location", type: "text", x: 35, y: 14, w: 28, h: 4 },
    ],
  },
  {
    name: "Networking Equipment",
    description: "Labels for routers, switches, firewalls, access points",
    category: "networking",
    fields: [
      { source: "assetTag", type: "text", x: 2, y: 2, w: 35, h: 5 },
      { source: "customFields.ipAddress", type: "text", x: 2, y: 7, w: 35, h: 4 },
      { source: "assetTag", type: "qrcode", x: 48, y: 2, w: 16, h: 10 },
      { source: "manufacturer", type: "text", x: 2, y: 14, w: 20, h: 4 },
      { source: "model", type: "text", x: 24, y: 14, w: 20, h: 4 },
      { source: "location", type: "text", x: 2, y: 19, w: 40, h: 4 },
    ],
  },
  {
    name: "Server Label",
    description: "Labels for rack and blade servers",
    category: "servers",
    fields: [
      { source: "assetTag", type: "text", x: 2, y: 2, w: 40, h: 5 },
      { source: "customFields.rackUnit", type: "text", x: 2, y: 7, w: 20, h: 4 },
      { source: "assetTag", type: "qrcode", x: 48, y: 2, w: 16, h: 10 },
      { source: "serialNumber", type: "barcode", x: 2, y: 14, w: 40, h: 8 },
    ],
  },
  {
    name: "Cable Label",
    description: "Labels for network cables and patch panels",
    category: "cabling",
    fields: [
      { source: "assetTag", type: "text", x: 2, y: 2, w: 30, h: 5 },
      { source: "customFields.portA", type: "text", x: 2, y: 8, w: 28, h: 4 },
      { source: "customFields.portB", type: "text", x: 32, y: 8, w: 28, h: 4 },
      { source: "customFields.cableType", type: "text", x: 2, y: 14, w: 25, h: 4 },
      { source: "customFields.length", type: "text", x: 28, y: 14, w: 15, h: 4 },
      { source: "assetTag", type: "barcode", x: 2, y: 19, w: 40, h: 5 },
    ],
  },
  {
    name: "Power Equipment",
    description: "Labels for UPS and PDU equipment",
    category: "power",
    fields: [
      { source: "assetTag", type: "text", x: 2, y: 2, w: 40, h: 5 },
      { source: "customFields.capacity", type: "text", x: 2, y: 7, w: 25, h: 4 },
      { source: "assetTag", type: "qrcode", x: 48, y: 2, w: 16, h: 10 },
      { source: "manufacturer", type: "text", x: 2, y: 14, w: 30, h: 4 },
      { source: "location", type: "text", x: 2, y: 19, w: 40, h: 4 },
    ],
  },
  {
    name: "Rack Label",
    description: "Labels for racks and enclosures",
    category: "physical",
    fields: [
      { source: "assetTag", type: "text", x: 2, y: 2, w: 40, h: 6 },
      { source: "location", type: "text", x: 2, y: 9, w: 40, h: 5 },
      { source: "assetTag", type: "qrcode", x: 48, y: 2, w: 16, h: 12 },
      { source: "customFields.rackUnits", type: "text", x: 2, y: 16, w: 20, h: 4 },
      { source: "customFields.maxLoad", type: "text", x: 25, y: 16, w: 20, h: 4 },
    ],
  },
  {
    name: "IoT/Edge Device",
    description: "Labels for IoT gateways, sensors, and edge controllers",
    category: "iot-edge",
    fields: [
      { source: "assetTag", type: "text", x: 2, y: 2, w: 35, h: 5 },
      { source: "customFields.protocol", type: "text", x: 2, y: 7, w: 20, h: 4 },
      { source: "assetTag", type: "qrcode", x: 48, y: 2, w: 16, h: 10 },
      { source: "customFields.connectivity", type: "text", x: 24, y: 7, w: 20, h: 4 },
      { source: "location", type: "text", x: 2, y: 14, w: 40, h: 4 },
      { source: "customFields.firmware", type: "text", x: 2, y: 19, w: 30, h: 4 },
    ],
  },
];

async function seed() {
  console.log("🌱 Seeding database...");

  const [existingTenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, "demo"))
    .limit(1);

  if (existingTenant) {
    console.log("ℹ️  Demo tenant already exists, skipping seed");
    process.exit(0);
  }

  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name: "Demo Company",
      slug: "demo",
      domain: null,
      settings: DEFAULT_TENANT_SETTINGS,
      isActive: true,
    })
    .returning();

  if (!tenant) {
    throw new Error("Failed to create tenant");
  }

  console.log(`✅ Created tenant: ${tenant.name} (${tenant.id})`);

  const adminPasswordHash = await hashPassword("admin123!");

  const [adminUser] = await db
    .insert(schema.users)
    .values({
      tenantId: tenant.id,
      email: "admin@demo.local",
      name: "Admin User",
      passwordHash: adminPasswordHash,
      role: "admin",
      isActive: true,
    })
    .returning();

  if (!adminUser) {
    throw new Error("Failed to create admin user");
  }

  console.log(`✅ Created admin user: ${adminUser.email}`);

  const managerPasswordHash = await hashPassword("manager123!");

  const [managerUser] = await db
    .insert(schema.users)
    .values({
      tenantId: tenant.id,
      email: "manager@demo.local",
      name: "Manager User",
      passwordHash: managerPasswordHash,
      role: "manager",
      isActive: true,
    })
    .returning();

  if (!managerUser) {
    throw new Error("Failed to create manager user");
  }

  console.log(`✅ Created manager user: ${managerUser.email}`);

  const userPasswordHash = await hashPassword("user123!");

  const [regularUser] = await db
    .insert(schema.users)
    .values({
      tenantId: tenant.id,
      email: "user@demo.local",
      name: "Regular User",
      passwordHash: userPasswordHash,
      role: "user",
      isActive: true,
    })
    .returning();

  if (!regularUser) {
    throw new Error("Failed to create regular user");
  }

  console.log(`✅ Created regular user: ${regularUser.email}`);

  console.log("\n🏷️  Creating default label templates...");

  for (const templateDef of CATEGORY_TEMPLATES) {
    const spec = createCategoryTemplate(
      templateDef.name,
      templateDef.category,
      templateDef.fields
    );

    const [template] = await db
      .insert(schema.labelTemplates)
      .values({
        tenantId: tenant.id,
        name: templateDef.name,
        description: templateDef.description,
        category: templateDef.category,
        format: "avery-5160",
        spec,
        version: 1,
        isPublished: true,
        publishedAt: new Date(),
        isSystemTemplate: true,
        createdBy: adminUser.id,
      })
      .returning();

    if (!template) {
      throw new Error(`Failed to create template: ${templateDef.name}`);
    }

    console.log(`   ✅ Created template: ${template.name}`);
  }

  console.log("\n📋 Demo credentials:");
  console.log("   Tenant slug: demo");
  console.log("   Admin: admin@demo.local / admin123!");
  console.log("   Manager: manager@demo.local / manager123!");
  console.log("   User: user@demo.local / user123!");

  console.log("\n✨ Seed completed successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
