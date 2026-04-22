import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true, userRegions: { include: { region: true } } },
    orderBy: { name: "asc" },
  });
  res.json(users);
});

router.post("/users", async (req, res) => {
  const bcrypt = await import("bcryptjs");
  const { email, name, role, password } = req.body;
  if (!email || !name || !password) return res.status(400).json({ error: "email, name, password required" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, name, passwordHash, role: role ?? "USER" } });
  res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

router.patch("/users/:id", async (req, res) => {
  const { name, role } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(role && { role }) },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json(user);
});

// Full pipeline across all regions for admin overview
router.get("/pipeline", async (_req, res) => {
  const regions = await prisma.region.findMany({
    include: {
      deals: {
        where: { isActive: true },
        include: {
          brand: true,
          categories: { include: { category: true } },
          monthlyEntries: true,
          createdBy: { select: { name: true } },
        },
      },
    },
  });
  res.json(regions);
});

export default router;
