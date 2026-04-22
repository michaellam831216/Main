import { PrismaClient, Probability, SnapshotType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Users
  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("user123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@pipeline.com" },
    update: {},
    create: { email: "admin@pipeline.com", name: "Admin User", passwordHash: adminHash, role: "ADMIN" },
  });

  const alice = await prisma.user.upsert({
    where: { email: "alice@pipeline.com" },
    update: {},
    create: { email: "alice@pipeline.com", name: "Alice Chen", passwordHash: userHash, role: "USER" },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@pipeline.com" },
    update: {},
    create: { email: "bob@pipeline.com", name: "Bob Smith", passwordHash: userHash, role: "USER" },
  });

  const carol = await prisma.user.upsert({
    where: { email: "carol@pipeline.com" },
    update: {},
    create: { email: "carol@pipeline.com", name: "Carol Lee", passwordHash: userHash, role: "USER" },
  });

  // Regions
  const emea = await prisma.region.upsert({
    where: { name: "EMEA" },
    update: {},
    create: { name: "EMEA", currency: "EUR" },
  });

  const apac = await prisma.region.upsert({
    where: { name: "APAC" },
    update: {},
    create: { name: "APAC", currency: "USD" },
  });

  const na = await prisma.region.upsert({
    where: { name: "North America" },
    update: {},
    create: { name: "North America", currency: "USD" },
  });

  const latam = await prisma.region.upsert({
    where: { name: "LATAM" },
    update: {},
    create: { name: "LATAM", currency: "USD" },
  });

  // Assign users to regions
  for (const [userId, regionId] of [
    [alice.id, emea.id],
    [alice.id, apac.id],  // Alice covers 2 regions (gets 2 tabs)
    [bob.id, na.id],
    [carol.id, latam.id],
    [admin.id, emea.id],
    [admin.id, apac.id],
    [admin.id, na.id],
    [admin.id, latam.id],
  ]) {
    await prisma.userRegion.upsert({
      where: { userId_regionId: { userId, regionId } },
      update: {},
      create: { userId, regionId },
    });
  }

  // Brands
  const brands = ["Apex Sports", "Luxe Collective", "Urban Edge", "TechWear", "Heritage Co."];
  const brandRecords: Record<string, string> = {};
  for (const name of brands) {
    const b = await prisma.brand.upsert({ where: { name }, update: {}, create: { name } });
    brandRecords[name] = b.id;
  }

  // Categories
  const categories = ["Footwear", "Apparel", "Accessories", "Home & Living", "Sports Equipment", "Beauty", "Toys"];
  const catRecords: Record<string, string> = {};
  for (const name of categories) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    catRecords[name] = c.id;
  }

  // Deals for EMEA (Alice)
  const emeaDeals = [
    {
      licenseeName: "SportMax GmbH",
      brandId: brandRecords["Apex Sports"],
      probability: "SIGNED" as Probability,
      contractStartDate: new Date("2026-01-01"),
      totalContractMg: 500000,
      categoryIds: [catRecords["Footwear"], catRecords["Apparel"]],
      monthly: { "2026-1": 45000, "2026-2": 48000, "2026-3": 52000, "2026-4": 41000 },
    },
    {
      licenseeName: "TBD - French Distributor",
      brandId: brandRecords["Luxe Collective"],
      probability: "HIGH" as Probability,
      contractStartDate: new Date("2026-03-01"),
      totalContractMg: 280000,
      categoryIds: [catRecords["Accessories"]],
      monthly: { "2026-3": 22000, "2026-4": 25000 },
    },
    {
      licenseeName: "Milano Fashion House",
      brandId: brandRecords["Heritage Co."],
      probability: "MEDIUM" as Probability,
      contractStartDate: new Date("2026-06-01"),
      totalContractMg: 180000,
      categoryIds: [catRecords["Apparel"], catRecords["Accessories"]],
      monthly: {},
    },
    {
      licenseeName: "EuroTech Retail AG",
      brandId: brandRecords["TechWear"],
      probability: "LOW" as Probability,
      contractStartDate: new Date("2026-09-01"),
      totalContractMg: 120000,
      categoryIds: [catRecords["Footwear"]],
      monthly: {},
    },
  ];

  const createdDeals: string[] = [];
  for (const d of emeaDeals) {
    const { categoryIds, monthly, ...dealData } = d;
    const deal = await prisma.deal.create({
      data: {
        ...dealData,
        regionId: emea.id,
        currency: emea.currency,
        createdById: alice.id,
        categories: { create: categoryIds.map((cid) => ({ categoryId: cid })) },
      },
    });
    createdDeals.push(deal.id);
    for (const [key, amount] of Object.entries(monthly)) {
      const [y, m] = key.split("-").map(Number);
      await prisma.monthlyEntry.create({ data: { dealId: deal.id, year: y, month: m, royaltyAmount: amount } });
    }
  }

  // Deals for NA (Bob)
  const naDeals = [
    {
      licenseeName: "American Sports Corp",
      brandId: brandRecords["Apex Sports"],
      probability: "SIGNED" as Probability,
      contractStartDate: new Date("2025-07-01"),
      totalContractMg: 1200000,
      categoryIds: [catRecords["Sports Equipment"], catRecords["Apparel"]],
      monthly: { "2025-7": 95000, "2025-8": 102000, "2025-9": 98000, "2025-10": 110000, "2025-11": 125000, "2025-12": 140000, "2026-1": 118000, "2026-2": 122000, "2026-3": 115000 },
    },
    {
      licenseeName: "TBD - West Coast Partner",
      brandId: brandRecords["Urban Edge"],
      probability: "HIGH" as Probability,
      contractStartDate: new Date("2026-04-01"),
      totalContractMg: 350000,
      categoryIds: [catRecords["Apparel"]],
      monthly: {},
    },
    {
      licenseeName: "HomeGoods Plus LLC",
      brandId: brandRecords["Heritage Co."],
      probability: "MEDIUM" as Probability,
      contractStartDate: new Date("2026-07-01"),
      totalContractMg: 200000,
      categoryIds: [catRecords["Home & Living"]],
      monthly: {},
    },
  ];

  for (const d of naDeals) {
    const { categoryIds, monthly, ...dealData } = d;
    const deal = await prisma.deal.create({
      data: {
        ...dealData,
        regionId: na.id,
        currency: na.currency,
        createdById: bob.id,
        categories: { create: categoryIds.map((cid) => ({ categoryId: cid })) },
      },
    });
    for (const [key, amount] of Object.entries(monthly)) {
      const [y, m] = key.split("-").map(Number);
      await prisma.monthlyEntry.create({ data: { dealId: deal.id, year: y, month: m, royaltyAmount: amount } });
    }
  }

  // Create a "last month" snapshot for EMEA so comparison works immediately
  const lastMonth = new Date();
  lastMonth.setDate(1);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const snapshotName = `Monthly – ${lastMonth.toLocaleString("en", { month: "long", year: "numeric" })}`;
  const snapshot = await prisma.snapshot.create({
    data: {
      name: snapshotName,
      type: SnapshotType.MONTHLY,
      regionId: emea.id,
      createdById: admin.id,
      createdAt: lastMonth,
      entries: {
        create: [
          {
            dealId: createdDeals[0],
            licenseeName: "SportMax GmbH",
            brandName: "Apex Sports",
            probability: "SIGNED",
            contractStartDate: new Date("2026-01-01"),
            totalContractMg: 500000,
            currency: "EUR",
            categories: JSON.stringify(["Footwear", "Apparel"]),
            monthlyData: JSON.stringify({ "2026-1": 45000, "2026-2": 48000 }),
          },
          {
            dealId: createdDeals[1],
            licenseeName: "TBD - French Distributor",
            brandName: "Luxe Collective",
            probability: "MEDIUM",
            contractStartDate: new Date("2026-03-01"),
            totalContractMg: 200000,
            currency: "EUR",
            categories: JSON.stringify(["Accessories"]),
            monthlyData: JSON.stringify({}),
          },
          {
            dealId: createdDeals[2],
            licenseeName: "Milano Fashion House",
            brandName: "Heritage Co.",
            probability: "LOW",
            contractStartDate: new Date("2026-06-01"),
            totalContractMg: 180000,
            currency: "EUR",
            categories: JSON.stringify(["Apparel", "Accessories"]),
            monthlyData: JSON.stringify({}),
          },
        ],
      },
    },
  });

  // Weekly snapshot (7+ days ago)
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 8);

  await prisma.snapshot.create({
    data: {
      name: `Weekly – ${lastWeek.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}`,
      type: SnapshotType.WEEKLY,
      regionId: emea.id,
      createdById: admin.id,
      createdAt: lastWeek,
      entries: {
        create: [
          {
            dealId: createdDeals[0],
            licenseeName: "SportMax GmbH",
            brandName: "Apex Sports",
            probability: "SIGNED",
            contractStartDate: new Date("2026-01-01"),
            totalContractMg: 480000,
            currency: "EUR",
            categories: JSON.stringify(["Footwear"]),
            monthlyData: JSON.stringify({ "2026-1": 45000, "2026-2": 48000, "2026-3": 50000 }),
          },
          {
            dealId: createdDeals[1],
            licenseeName: "TBD - French Distributor",
            brandName: "Luxe Collective",
            probability: "HIGH",
            contractStartDate: new Date("2026-03-01"),
            totalContractMg: 280000,
            currency: "EUR",
            categories: JSON.stringify(["Accessories"]),
            monthlyData: JSON.stringify({ "2026-3": 18000 }),
          },
        ],
      },
    },
  });

  console.log("✅ Seed complete");
  console.log("   admin@pipeline.com / admin123");
  console.log("   alice@pipeline.com / user123  (EMEA + APAC)");
  console.log("   bob@pipeline.com   / user123  (North America)");
  console.log("   carol@pipeline.com / user123  (LATAM)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
