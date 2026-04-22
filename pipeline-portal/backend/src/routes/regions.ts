import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  if (req.user!.role === "ADMIN") {
    const regions = await prisma.region.findMany({ orderBy: { name: "asc" } });
    return res.json(regions);
  }
  const userRegions = await prisma.userRegion.findMany({
    where: { userId: req.user!.userId },
    include: { region: true },
    orderBy: { region: { name: "asc" } },
  });
  res.json(userRegions.map((ur) => ur.region));
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, currency } = req.body;
  if (!name || !currency) return res.status(400).json({ error: "name and currency required" });
  const region = await prisma.region.create({ data: { name, currency: currency.toUpperCase() } });
  res.status(201).json(region);
});

router.patch("/:id", requireAdmin, async (req, res) => {
  const { name, currency } = req.body;
  const region = await prisma.region.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(currency && { currency: currency.toUpperCase() }) },
  });
  res.json(region);
});

router.post("/:id/users", requireAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const ur = await prisma.userRegion.upsert({
    where: { userId_regionId: { userId, regionId: req.params.id } },
    update: {},
    create: { userId, regionId: req.params.id },
  });
  res.status(201).json(ur);
});

router.delete("/:id/users/:userId", requireAdmin, async (req, res) => {
  await prisma.userRegion.deleteMany({ where: { userId: req.params.userId, regionId: req.params.id } });
  res.json({ ok: true });
});

router.get("/:id/users", requireAdmin, async (req, res) => {
  const users = await prisma.userRegion.findMany({
    where: { regionId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
  res.json(users.map((ur) => ur.user));
});

export default router;
