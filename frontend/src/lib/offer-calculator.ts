import { Product } from "./shop-data";
import { QuantityOfferRule, SystemSettings } from "@/types/settings";

export interface OfferEvaluationResult {
  discountAmount: number;
  isFreeDelivery: boolean;
  appliedOfferTitle?: string;
  appliedOfferRuleId?: string;
  eligibleQuantity: number;
}

interface CartItemInput {
  qty: number;
  price: number;
  product?: Product | null;
  offerRuleIds?: string[];
  isCombo?: boolean;
}

interface CalculatorParams {
  items: CartItemInput[];
  settings?: SystemSettings | null;
  baseDeliveryCharge?: number;
}

function offerAppliesToChannel(offer: QuantityOfferRule, isCombo: boolean): boolean {
  const channels = offer.applicableTo || [];
  if (channels.length === 0) return false;
  return isCombo ? channels.includes("combo") : channels.includes("normal");
}

function evaluateOfferForGroup(
  offer: QuantityOfferRule,
  groupQty: number,
  groupAmount: number
): { discount: number; freeDelivery: boolean } {
  if (groupQty < offer.minQty) return { discount: 0, freeDelivery: false };
  if (offer.offerType === "free_delivery") {
    return { discount: 0, freeDelivery: true };
  }
  if (offer.offerType === "fixed_discount") {
    return { discount: Number(offer.discountAmount) || 0, freeDelivery: false };
  }
  if (offer.offerType === "percentage_discount") {
    const pct = (Number(offer.discountAmount) || 0) / 100;
    return { discount: Math.round(groupAmount * pct), freeDelivery: false };
  }
  return { discount: 0, freeDelivery: false };
}

function pickBest(
  candidates: Array<{ offer: QuantityOfferRule; qty: number; amount: number }>,
  freeShippingEnabled: boolean,
): { offer: QuantityOfferRule; discount: number; freeDelivery: boolean } | null {
  let bestFree: { offer: QuantityOfferRule; discount: number; freeDelivery: boolean } | null = null;
  let bestDiscount: { offer: QuantityOfferRule; discount: number; freeDelivery: boolean } | null = null;

  for (const c of candidates) {
    const evald = evaluateOfferForGroup(c.offer, c.qty, c.amount);
    if (evald.freeDelivery) {
      if (!bestFree || c.offer.discountAmount! > bestFree.offer.discountAmount!) {
        bestFree = { offer: c.offer, discount: 0, freeDelivery: true };
      }
    } else if (evald.discount > 0) {
      if (!bestDiscount || evald.discount > bestDiscount.discount) {
        bestDiscount = { offer: c.offer, discount: evald.discount, freeDelivery: false };
      }
    }
  }

  // Prefer free-delivery over fixed-discount (more customer value, no stacking).
  if (bestFree && freeShippingEnabled) return bestFree;
  if (bestDiscount) return bestDiscount;
  if (bestFree) return bestFree; // toggled off but still report (caller may ignore)
  return null;
}

/**
 * Calculates quantity-based discounts and free delivery perks
 * based on cart lines / product selections and global settings configuration.
 *
 * Semantics:
 * - Each item carries `offerRuleIds` (the offers assigned to that product)
 *   and `isCombo` (whether it is a combo product).
 * - An offer rule only applies to items whose channel matches its `applicableTo`
 *   scoping (Normal vs Combo). CLP passes no `isCombo` so it falls through.
 * - When multiple qualifying offers exist, the BEST ONE applies (not stacked).
 *   Free-delivery beats fixed-discount when both qualify.
 * - `enableFreeShipping` is the master kill-switch for free-delivery offers.
 * - If no product-assigned offer qualifies, a global fallback finds the best
 *   single offer whose minQty is met by the TOTAL cart quantity (CLP path).
 */
export function calculateQuantityOfferDiscount(params: CalculatorParams): OfferEvaluationResult {
  const { items, settings, baseDeliveryCharge = 70 } = params;
  const globalOffers = (settings?.shipping?.quantityOffers || []).filter((o) => o.active);
  const freeShippingEnabled = settings?.shipping?.enableFreeShipping ?? true;

  // Group items by each offer rule they carry
  const groupByOffer: Record<string, { qty: number; amount: number }> = {};
  let totalCartQty = 0;
  let totalCartAmount = 0;
  let anyItemIsCombo: boolean | null = null;
  const productAssignedOfferIds = new Set<string>();

  for (const item of items) {
    if (!item.qty || item.qty <= 0) continue;
    totalCartQty += item.qty;
    totalCartAmount += item.price * item.qty;
    if (item.isCombo === true) anyItemIsCombo = true;
    if (item.isCombo === false) anyItemIsCombo = false;

    const ids = item.offerRuleIds || item.product?.offerRuleIds || [];
    for (const id of ids) {
      productAssignedOfferIds.add(id);
      if (!groupByOffer[id]) groupByOffer[id] = { qty: 0, amount: 0 };
      groupByOffer[id].qty += item.qty;
      groupByOffer[id].amount += item.price * item.qty;
    }
  }

  // 1. Try product-assigned offers
  const candidates: Array<{ offer: QuantityOfferRule; qty: number; amount: number }> = [];
  for (const ruleId of productAssignedOfferIds) {
    const offer = globalOffers.find((o) => o.id === ruleId);
    if (!offer) continue;
    if (anyItemIsCombo !== null && !offerAppliesToChannel(offer, anyItemIsCombo)) continue;
    candidates.push({ offer, qty: groupByOffer[ruleId].qty, amount: groupByOffer[ruleId].amount });
  }

  let bestPick = pickBest(candidates, freeShippingEnabled);

  // 2. Fallback: no product-assigned offers matched — check total cart qty against global rules
  if (!bestPick && totalCartQty > 0) {
    // For fallback: only consider offers whose channel matches the dominant cart type,
    // or that apply to both. If cart has mixed types, prefer offers that apply to both.
    const cartIsCombo = anyItemIsCombo === true;
    const fallbackCandidates: Array<{ offer: QuantityOfferRule; qty: number; amount: number }> = [];
    for (const offer of globalOffers) {
      const applies = offer.applicableTo.includes("normal") || offer.applicableTo.includes("combo");
      if (!applies) continue;
      if (anyItemIsCombo !== null && offer.applicableTo.length === 1) {
        if (cartIsCombo && !offer.applicableTo.includes("combo")) continue;
        if (!cartIsCombo && !offer.applicableTo.includes("normal")) continue;
      }
      fallbackCandidates.push({ offer, qty: totalCartQty, amount: totalCartAmount });
    }
    bestPick = pickBest(fallbackCandidates, freeShippingEnabled);
  }

  if (!bestPick) {
    return { discountAmount: 0, isFreeDelivery: false, eligibleQuantity: totalCartQty };
  }

  const isFreeDelivery = bestPick.freeDelivery && freeShippingEnabled;

  return {
    discountAmount: bestPick.discount,
    isFreeDelivery,
    appliedOfferTitle: bestPick.offer.title,
    appliedOfferRuleId: bestPick.offer.id,
    eligibleQuantity: totalCartQty,
  };
}
