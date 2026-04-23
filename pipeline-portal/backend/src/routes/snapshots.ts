import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { takeSnapshot, getComparisonSnapshot, buildComparison } from "../services/snapshot";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const { regionId } = req.query;
  const where = regionId ? { regionId: regionId as string } : {};
  const snapshots = await prisma.snapshot.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
    take: 20,
  });
  res.json(snapshots);
});

router.post("/", requireAdmin, async (req, res) => {
  const { regionId, name } = req.body;
  if (!regionId || !name) return res.status(400).json({ error: "regionId and name required" });

  const snapshot = await takeSnapshot(regionId, "MANUAL", name, req.user!.userId);
  res.status(201).json(snapshot);
});

router.get("/compare", async (req, res) => {
  const { regionId, type } = req.query as { regionId: string; type: "week" | "month" };
  if (!regionId || !type) return res.status(400).json({ error: "regionId and type required" });

  const currentDeals = await prisma.deal.findMany({
    where: { regionId, isActive: true },
    include: { monthlyEntries: true },
  });

  const snapshot = await getComparisonSnapshot(regionId, type);
  if (!snapshot) {
    return res.json({ available: false, message: `No ${type === "week" ? "weekly" : "monthly"} snapshot found` });
  }

  const comparison = buildComparison(currentDeals, snapshot.entries);
  res.json({ available: true, snapshotName: snapshot.name, snapshotDate: snapshot.createdAt, ...comparison });
});

export default router;
