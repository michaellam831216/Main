import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth, requireAnalytics } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();
router.use(requireAuth, requireAnalytics);

const PROBABILITY_WEIGHTS: Record<string, number> = {
  SIGNED: 1.0,
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.2,
};

// GET /api/dashboard/summary
router.get("/summary", async (_req, res) => {
  const deals = await prisma.deal.findMany({
    where: { isActive: true },
    include: {
      brand: true,
      region: true,
      createdBy: { select: { id: true, name: true, email: true } },
      monthlyEntries: true,
      categories: { include: { category: true } },
    },
  });

  const totalMg = deals.reduce((s, d) => s + d.totalContractMg, 0);
  const weightedMg = deals.reduce((s, d) => s + d.totalContractMg * (PROBABILITY_WEIGHTS[d.probability] ?? 0), 0);
  const totalCollected = deals.reduce(
    (s, d) => s + d.monthlyEntries.reduce((a, e) => a + e.royaltyAmount, 0),
    0
  );
  const totalMgScheduled = deals.reduce(
    (s, d) => s + d.monthlyEntries.reduce((a, e) => a + e.mgPayment, 0),
    0
  );

  // By Brand
  const brandMap = new Map<string, { name: string; deals: typeof deals }>();
  for (const d of deals) {
    const name = d.brand.name;
    if (!brandMap.has(name)) brandMap.set(name, { name, deals: [] });
    brandMap.get(name)!.deals.push(d);
  }
  const byBrand = Array.from(brandMap.values())
    .map(({ name, deals: ds }) => ({
      name,
      dealCount: ds.length,
      totalMg: ds.reduce((s, d) => s + d.totalContractMg, 0),
      weightedMg: ds.reduce((s, d) => s + d.totalContractMg * (PROBABILITY_WEIGHTS[d.probability] ?? 0), 0),
      collected: ds.reduce((s, d) => s + d.monthlyEntries.reduce((a, e) => a + e.royaltyAmount, 0), 0),
    }))
    .sort((a, b) => b.totalMg - a.totalMg);

  // By Region
  const regionMap = new Map<string, { name: string; currency: string; deals: typeof deals }>();
  for (const d of deals) {
    const name = d.region.name;
    if (!regionMap.has(name)) regionMap.set(name, { name, currency: d.region.currency, deals: [] });
    regionMap.get(name)!.deals.push(d);
  }
  const byRegion = Array.from(regionMap.values())
    .map(({ name, currency, deals: ds }) => ({
      name,
      currency,
      dealCount: ds.length,
      totalMg: ds.reduce((s, d) => s + d.totalContractMg, 0),
      weightedMg: ds.reduce((s, d) => s + d.totalContractMg * (PROBABILITY_WEIGHTS[d.probability] ?? 0), 0),
      collected: ds.reduce((s, d) => s + d.monthlyEntries.reduce((a, e) => a + e.royaltyAmount, 0), 0),
    }))
    .sort((a, b) => b.totalMg - a.totalMg);

  // By Person
  const personMap = new Map<string, { name: string; email: string; deals: typeof deals }>();
  for (const d of deals) {
    const { id, name, email } = d.createdBy;
    if (!personMap.has(id)) personMap.set(id, { name, email, deals: [] });
    personMap.get(id)!.deals.push(d);
  }
  const byPerson = Array.from(personMap.values())
    .map(({ name, email, deals: ds }) => ({
      name,
      email,
      dealCount: ds.length,
      totalMg: ds.reduce((s, d) => s + d.totalContractMg, 0),
      weightedMg: ds.reduce((s, d) => s + d.totalContractMg * (PROBABILITY_WEIGHTS[d.probability] ?? 0), 0),
      collected: ds.reduce((s, d) => s + d.monthlyEntries.reduce((a, e) => a + e.royaltyAmount, 0), 0),
    }))
    .sort((a, b) => b.totalMg - a.totalMg);

  // Monthly trend: last 13 months (12 past + current)
  const now = new Date();
  const trend: { label: string; year: number; month: number; mgScheduled: number; collected: number }[] = [];
  for (let offset = -12; offset <= 0; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const label = d.toLocaleString("en", { month: "short", year: "2-digit" });
    let mgScheduled = 0;
    let collected = 0;
    for (const deal of deals) {
      const entry = deal.monthlyEntries.find((e) => e.year === year && e.month === month);
      if (entry) {
        mgScheduled += entry.mgPayment;
        collected += entry.royaltyAmount;
      }
    }
    trend.push({ label, year, month, mgScheduled, collected });
  }

  // By Probability summary
  const probabilities = ["SIGNED", "HIGH", "MEDIUM", "LOW"] as const;
  const byProbability = probabilities.map((prob) => {
    const ds = deals.filter((d) => d.probability === prob);
    return {
      probability: prob,
      dealCount: ds.length,
      totalMg: ds.reduce((s, d) => s + d.totalContractMg, 0),
      weightedMg: ds.reduce((s, d) => s + d.totalContractMg * (PROBABILITY_WEIGHTS[prob] ?? 0), 0),
      collected: ds.reduce((s, d) => s + d.monthlyEntries.reduce((a, e) => a + e.royaltyAmount, 0), 0),
    };
  });

  res.json({
    kpi: {
      dealCount: deals.length,
      totalMg,
      weightedMg,
      totalCollected,
      totalMgScheduled,
    },
    byBrand,
    byRegion,
    byPerson,
    byProbability,
    trend,
  });
});

// POST /api/dashboard/ask
router.post("/ask", async (req, res) => {
  const { question } = req.body as { question: string };
  if (!question?.trim()) return res.status(400).json({ error: "question required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-anthropic-api-key-here") {
    return res.status(503).json({ error: "AI Q&A is not configured. Set ANTHROPIC_API_KEY in backend .env." });
  }

  // Fetch summary data to provide as context
  const deals = await prisma.deal.findMany({
    where: { isActive: true },
    include: {
      brand: true,
      region: true,
      createdBy: { select: { name: true } },
      monthlyEntries: true,
    },
  });

  const totalMg = deals.reduce((s, d) => s + d.totalContractMg, 0);
  const totalCollected = deals.reduce(
    (s, d) => s + d.monthlyEntries.reduce((a, e) => a + e.royaltyAmount, 0),
    0
  );

  // Compact deal list for context
  const dealSummaries = deals.map((d) => ({
    licensee: d.licenseeName,
    brand: d.brand.name,
    region: d.region.name,
    currency: d.currency,
    probability: d.probability,
    contractMg: d.totalContractMg,
    collected: d.monthlyEntries.reduce((a, e) => a + e.royaltyAmount, 0),
    mgScheduled: d.monthlyEntries.reduce((a, e) => a + e.mgPayment, 0),
    owner: d.createdBy.name,
    startDate: d.contractStartDate,
  }));

  const contextJson = JSON.stringify({ totalDeals: deals.length, totalMg, totalCollected, deals: dealSummaries }, null, 2);

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: `You are a business analytics assistant for a licensing pipeline portal. You help stakeholders understand pipeline performance, deal status, and revenue trends. Answer concisely and factually based only on the data provided. If you cannot answer from the data, say so clearly.

Today's date: ${new Date().toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}.

Pipeline Data:
${contextJson}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: question.trim() }],
  });

  const text = message.content.find((b) => b.type === "text")?.text ?? "";
  res.json({ answer: text });
});

export default router;
