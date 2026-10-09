import type { NutritionFood, Order } from "../types";

export function normalizeName(value: string): string {
  return value
    .replace(/\s+/g, "")
    .replace(/[（）()【】\[\]]/g, "")
    .replace(/[·・\-—_]/g, "")
    .toLowerCase();
}

export type NutritionIndex = Map<string, NutritionFood>;

export function buildNutritionIndex(foods: NutritionFood[]): NutritionIndex {
  const index: NutritionIndex = new Map();
  for (const food of foods) index.set(normalizeName(food.productName), food);
  return index;
}

export function matchNutrition(name: string, index: NutritionIndex): NutritionFood | null {
  const key = normalizeName(name);
  if (!key) return null;
  const exact = index.get(key);
  if (exact) return exact;
  let best: NutritionFood | null = null;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const [candidate, food] of index) {
    if (candidate.includes(key) || key.includes(candidate)) {
      const diff = Math.abs(candidate.length - key.length);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = food;
      }
    }
  }
  return best;
}

export interface LeafItem {
  name: string;
  quantity: number;
}

export function expandOrderItems(order: Order): LeafItem[] {
  const leaves: LeafItem[] = [];
  for (const product of order.orderProductList ?? []) {
    const qty = product.quantity || 1;
    if (product.comboItemList && product.comboItemList.length > 0) {
      for (const combo of product.comboItemList) {
        leaves.push({ name: combo.name, quantity: (combo.quantity || 1) * qty });
      }
    } else {
      leaves.push({ name: product.productName, quantity: qty });
    }
  }
  return leaves;
}

export interface NutritionTotals {
  energyKcal: number;
  protein: number;
  fat: number;
  carbohydrate: number;
  sodium: number;
  calcium: number;
}

export const EMPTY_TOTALS: NutritionTotals = {
  energyKcal: 0,
  protein: 0,
  fat: 0,
  carbohydrate: 0,
  sodium: 0,
  calcium: 0,
};

export interface IntakeItem {
  name: string;
  quantity: number;
  food: NutritionFood | null;
}

export interface IntakeResult {
  totals: NutritionTotals;
  items: IntakeItem[];
  matchedCount: number;
  totalCount: number;
}

export function computeIntake(orders: Order[], index: NutritionIndex): IntakeResult {
  const totals: NutritionTotals = { ...EMPTY_TOTALS };
  const items: IntakeItem[] = [];
  let matchedCount = 0;
  let totalCount = 0;

  for (const order of orders) {
    for (const leaf of expandOrderItems(order)) {
      totalCount += 1;
      const food = matchNutrition(leaf.name, index);
      if (food) {
        matchedCount += 1;
        totals.energyKcal += food.energyKcal * leaf.quantity;
        totals.protein += food.protein * leaf.quantity;
        totals.fat += food.fat * leaf.quantity;
        totals.carbohydrate += food.carbohydrate * leaf.quantity;
        totals.sodium += food.sodium * leaf.quantity;
        totals.calcium += food.calcium * leaf.quantity;
      }
      items.push({ name: leaf.name, quantity: leaf.quantity, food });
    }
  }

  return { totals, items, matchedCount, totalCount };
}
