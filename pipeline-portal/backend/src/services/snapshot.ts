import { prisma } from "../lib/prisma";
import { SnapshotType } from "@prisma/client";

export async function takeSnapshot(regionId: string, type: SnapshotType, name: string, createdById: string) {
  const deals = await prisma.deal.findMany({
    where: { regionId, isActive: true },
    include: {
      brand: true,
      categories: { include: { category: true } },
      monthlyEntries: true,
    },
  });

  return prisma.snapshot.create({
    data: {
      name,
      type,
      regionId,
      createdById,
      entries: {
        create: deals.map((deal) => ({
          dealId: deal.id,
          licenseeName: deal.licenseeName,
          brandName: deal.brand.name,
          probability: deal.probability,
          contractStartDate: deal.contractStartDate,
          totalContractMg: deal.totalContractMg,
          currency: deal.currency,
          categories: JSON.stringify(deal.categories.map((dc) => dc.category.name)),
          monthlyData: JSON.stringify(
            Object.fromEntries(deal.monthlyEntries.map((e) => [`${e.year}-${e.month}`, e.royaltyAmount]))
          ),
        })),
      },
    },
    include: { entries: true },
  });
}

export async function getComparisonSnapshot(regionId: string, type: "week" | "month") {
  const cutoff = new Date();
  if (type === "week") cutoff.setDate(cutoff.getDate() - 7);
  else cutoff.setMonth(cutoff.getMonth() - 1);

  return prisma.snapshot.findFirst({
    where: {
      regionId,
      createdAt: { lte: cutoff },
    },
    orderBy: { createdAt: "desc" },
    include: { entries: true },
  });
}

function sumMg(entries: { totalContractMg: number; probability: string }[], prob?: string) {
  return entries
    .filter((e) => (prob ? e.probability === prob : true))
    .reduce((acc, e) => acc + e.totalContractMg, 0);
}

function sumMonthlyRevenue(entries: { monthlyData: string }[]) {
  return entries.reduce((acc, e) => {
    const data = JSON.parse(e.monthlyData) as Record<string, number>;
    return acc + Object.values(data).reduce((s, v) => s + v, 0);
  }, 0);
}

export function buildComparison(
  currentDeals: { id: string; totalContractMg: number; probability: string; monthlyEntries: { royaltyAmount: number }[] }[],
  snapshotEntries: { totalContractMg: number; probability: string; monthlyData: string }[]
) {
  const currentTotal = currentDeals.reduce((a, d) => a + d.totalContractMg, 0);
  const currentMonthly = currentDeals.reduce((a, d) => a + d.monthlyEntries.reduce((s, e) => s + e.royaltyAmount, 0), 0);
  const snapshotTotal = sumMg(snapshotEntries);
  const snapshotMonthly = sumMonthlyRevenue(snapshotEntries);

  const delta = (cur: number, prev: number) => ({
    current: cur,
    previous: prev,
    absolute: cur - prev,
    percent: prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10,
    direction: cur > prev ? "up" : cur < prev ? "down" : "same",
  });

  return {
    totalMg: delta(currentTotal, snapshotTotal),
    totalRoyalties: delta(currentMonthly, snapshotMonthly),
    dealCount: delta(currentDeals.length, snapshotEntries.length),
    byProbability: {
      SIGNED: delta(
        currentDeals.filter((d) => d.probability === "SIGNED").reduce((a, d) => a + d.totalContractMg, 0),
        sumMg(snapshotEntries, "SIGNED")
      ),
      HIGH: delta(
        currentDeals.filter((d) => d.probability === "HIGH").reduce((a, d) => a + d.totalContractMg, 0),
        sumMg(snapshotEntries, "HIGH")
      ),
      MEDIUM: delta(
        currentDeals.filter((d) => d.probability === "MEDIUM").reduce((a, d) => a + d.totalContractMg, 0),
        sumMg(snapshotEntries, "MEDIUM")
      ),
      LOW: delta(
        currentDeals.filter((d) => d.probability === "LOW").reduce((a, d) => a + d.totalContractMg, 0),
        sumMg(snapshotEntries, "LOW")
      ),
    },
  };
}
