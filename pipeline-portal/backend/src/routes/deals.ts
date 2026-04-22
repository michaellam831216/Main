import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const dealInclude = {
  brand: true,
  region: true,
  createdBy: { select: { id: true, name: true, email: true } },
  categories: { include: { category: true } },
  monthlyEntries: { orderBy: [{ year: "asc" as const }, { month: "asc" as const }] },
};

async function assertRegionAccess(userId: string, role: string, regionId: string) {
  if (role === "ADMIN") return true;
  const ur = await prisma.userRegion.findUnique({ where: { userId_regionId: { userId, regionId } } });
  return !!ur;
}

router.get("/", async (req, res) => {
  const { regionId } = req.query;
  if (!regionId) return res.status(400).json({ error: "regionId required" });

  const hasAccess = await assertRegionAccess(req.user!.userId, req.user!.role, regionId as string);
  if (!hasAccess) return res.status(403).json({ error: "No access to this region" });

  const deals = await prisma.deal.findMany({
    where: { regionId: regionId as string, isActive: true },
    include: dealInclude,
    orderBy: { updatedAt: "desc" },
  });
  res.json(deals);
});

router.post("/", async (req, res) => {
  const { licenseeName, brandId, regionId, probability, contractStartDate, totalContractMg, categoryIds, notes } = req.body;

  const hasAccess = await assertRegionAccess(req.user!.userId, req.user!.role, regionId);
  if (!hasAccess) return res.status(403).json({ error: "No access to this region" });

  const region = await prisma.region.findUnique({ where: { id: regionId } });
  if (!region) return res.status(404).json({ error: "Region not found" });

  const deal = await prisma.deal.create({
    data: {
      licenseeName,
      brandId,
      regionId,
      probability,
      contractStartDate: new Date(contractStartDate),
      totalContractMg: Number(totalContractMg),
      currency: region.currency,
      createdById: req.user!.userId,
      notes,
      categories: { create: (categoryIds ?? []).map((cid: string) => ({ categoryId: cid })) },
    },
    include: dealInclude,
  });
  res.status(201).json(deal);
});

router.get("/:id", async (req, res) => {
  const deal = await prisma.deal.findUnique({ where: { id: req.params.id }, include: dealInclude });
  if (!deal || !deal.isActive) return res.status(404).json({ error: "Deal not found" });

  const hasAccess = await assertRegionAccess(req.user!.userId, req.user!.role, deal.regionId);
  if (!hasAccess) return res.status(403).json({ error: "No access" });

  const auditLog = await prisma.auditLog.findMany({
    where: { dealId: deal.id },
    include: { changedBy: { select: { name: true } } },
    orderBy: { changedAt: "desc" },
    take: 50,
  });

  res.json({ ...deal, auditLog });
});

router.patch("/:id", async (req, res) => {
  const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
  if (!deal || !deal.isActive) return res.status(404).json({ error: "Deal not found" });

  const hasAccess = await assertRegionAccess(req.user!.userId, req.user!.role, deal.regionId);
  if (!hasAccess) return res.status(403).json({ error: "No access" });

  const { licenseeName, brandId, probability, contractStartDate, totalContractMg, categoryIds, notes } = req.body;

  const auditEntries: { dealId: string; fieldName: string; oldValue: string | null; newValue: string | null; changedById: string }[] = [];

  const trackField = (field: string, oldVal: unknown, newVal: unknown) => {
    const oldStr = oldVal != null ? String(oldVal) : null;
    const newStr = newVal != null ? String(newVal) : null;
    if (oldStr !== newStr) {
      auditEntries.push({ dealId: deal.id, fieldName: field, oldValue: oldStr, newValue: newStr, changedById: req.user!.userId });
    }
  };

  if (licenseeName !== undefined) trackField("licenseeName", deal.licenseeName, licenseeName);
  if (brandId !== undefined) trackField("brandId", deal.brandId, brandId);
  if (probability !== undefined) trackField("probability", deal.probability, probability);
  if (contractStartDate !== undefined) trackField("contractStartDate", deal.contractStartDate.toISOString(), contractStartDate);
  if (totalContractMg !== undefined) trackField("totalContractMg", deal.totalContractMg, totalContractMg);
  if (notes !== undefined) trackField("notes", deal.notes, notes);

  await prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: deal.id },
      data: {
        ...(licenseeName !== undefined && { licenseeName }),
        ...(brandId !== undefined && { brandId }),
        ...(probability !== undefined && { probability }),
        ...(contractStartDate !== undefined && { contractStartDate: new Date(contractStartDate) }),
        ...(totalContractMg !== undefined && { totalContractMg: Number(totalContractMg) }),
        ...(notes !== undefined && { notes }),
        ...(categoryIds !== undefined && {
          categories: {
            deleteMany: {},
            create: categoryIds.map((cid: string) => ({ categoryId: cid })),
          },
        }),
      },
    });
    if (auditEntries.length > 0) await tx.auditLog.createMany({ data: auditEntries });
  });

  const updated = await prisma.deal.findUnique({ where: { id: deal.id }, include: dealInclude });
  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
  if (!deal) return res.status(404).json({ error: "Not found" });

  const hasAccess = await assertRegionAccess(req.user!.userId, req.user!.role, deal.regionId);
  if (!hasAccess) return res.status(403).json({ error: "No access" });

  await prisma.deal.update({ where: { id: deal.id }, data: { isActive: false } });
  res.json({ ok: true });
});

// Monthly entries
router.get("/:id/monthly", async (req, res) => {
  const entries = await prisma.monthlyEntry.findMany({
    where: { dealId: req.params.id },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  res.json(entries);
});

router.put("/:id/monthly", async (req, res) => {
  const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
  if (!deal || !deal.isActive) return res.status(404).json({ error: "Deal not found" });

  const hasAccess = await assertRegionAccess(req.user!.userId, req.user!.role, deal.regionId);
  if (!hasAccess) return res.status(403).json({ error: "No access" });

  const entries: { year: number; month: number; royaltyAmount?: number; mgPayment?: number }[] = req.body;

  await prisma.$transaction(
    entries.map((e) =>
      prisma.monthlyEntry.upsert({
        where: { dealId_year_month: { dealId: deal.id, year: e.year, month: e.month } },
        update: {
          ...(e.royaltyAmount !== undefined && { royaltyAmount: e.royaltyAmount }),
          ...(e.mgPayment !== undefined && { mgPayment: e.mgPayment }),
        },
        create: {
          dealId: deal.id,
          year: e.year,
          month: e.month,
          royaltyAmount: e.royaltyAmount ?? 0,
          mgPayment: e.mgPayment ?? 0,
        },
      })
    )
  );

  const updated = await prisma.monthlyEntry.findMany({
    where: { dealId: deal.id },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  res.json(updated);
});

export default router;
