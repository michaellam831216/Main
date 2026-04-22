import axios from "axios";
import { prisma } from "../lib/prisma";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const cached = await prisma.fxRate.findUnique({ where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } } });
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return cached.rate;
  }

  try {
    const { data } = await axios.get(`${process.env.FX_API_BASE}/latest`, { params: { from, to }, timeout: 5000 });
    const rate: number = data.rates[to];
    if (!rate) throw new Error(`No rate for ${from}→${to}`);

    await prisma.fxRate.upsert({
      where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
      update: { rate, fetchedAt: new Date() },
      create: { fromCurrency: from, toCurrency: to, rate },
    });
    return rate;
  } catch (err) {
    if (cached) return cached.rate; // stale fallback
    throw err;
  }
}

export async function convertAmount(amount: number, from: string, to: string): Promise<number> {
  const rate = await getRate(from, to);
  return Math.round(amount * rate * 100) / 100;
}
