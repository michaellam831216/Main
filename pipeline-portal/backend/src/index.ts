import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cron from "node-cron";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";
import regionsRouter from "./routes/regions";
import brandsRouter from "./routes/brands";
import categoriesRouter from "./routes/categories";
import dealsRouter from "./routes/deals";
import snapshotsRouter from "./routes/snapshots";
import adminRouter from "./routes/admin";
import dashboardRouter from "./routes/dashboard";
import { prisma } from "./lib/prisma";
import { takeSnapshot } from "./services/snapshot";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/regions", regionsRouter);
app.use("/api/brands", brandsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/snapshots", snapshotsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/dashboard", dashboardRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// Auto weekly snapshots – every Sunday at 23:55
cron.schedule("55 23 * * 0", async () => {
  const regions = await prisma.region.findMany();
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) return;
  const label = new Date().toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
  for (const region of regions) {
    await takeSnapshot(region.id, "WEEKLY", `Weekly – ${label}`, adminUser.id).catch(console.error);
  }
  console.log("Weekly snapshots taken");
});

// Auto monthly snapshots – 1st of each month at 00:05
cron.schedule("5 0 1 * *", async () => {
  const regions = await prisma.region.findMany();
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) return;
  const prev = new Date();
  prev.setMonth(prev.getMonth() - 1);
  const label = prev.toLocaleString("en", { month: "long", year: "numeric" });
  for (const region of regions) {
    await takeSnapshot(region.id, "MONTHLY", `Monthly – ${label}`, adminUser.id).catch(console.error);
  }
  console.log("Monthly snapshots taken");
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
