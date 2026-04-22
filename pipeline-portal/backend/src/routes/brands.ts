import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  res.json(brands);
});

router.post("/", requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const brand = await prisma.brand.create({ data: { name } });
  res.status(201).json(brand);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  await prisma.brand.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
