import { Product } from "./shop-data";
import { QuantityOfferRule, SystemSettings } from "@/types/settings";

export interface OfferEvaluationResult {
  discountAmount: number;
  isFreeDelivery: boolean;
  appliedOfferTitle?: string;
  appliedOfferRuleId?: string;
  eligibleQuantity: number;
}

/**
 * Calculates quantity-based discounts and free delivery perks
 * based on cart lines / product selections and global settings configuration.
 */
export function calculateQuantityOfferDiscount(params: {
  items: Array<{
    qty: number;
    price: number;
    product?: Product | null;
    offerRuleId?: string;
  }>;
  settings?: SystemSettings | null;
  baseDeliveryCharge?: number;
}): OfferEvaluationResult {
  const { items, settings, baseDeliveryCharge = 70 } = params;
  const globalOffers = (settings?.shipping?.quantityOffers || []).filter((o) => o.active);

  let totalDiscount = 0;
  let isFreeDelivery = false;
  let highestOfferTitle: string | undefined = undefined;
  let highestOfferRuleId: string | undefined = undefined;

  // 1. Group items by assigned offerRuleId or evaluate per item
  const offerGroupQuantities: Record<string, { totalQty: number; totalAmount: number }> = {};

  for (const item of items) {
    if (!item.qty || item.qty <= 0) continue;
    const ruleId = item.offerRuleId || item.product?.offerRuleId;

    if (ruleId) {
      if (!offerGroupQuantities[ruleId]) {
        offerGroupQuantities[ruleId] = { totalQty: 0, totalAmount: 0 };
      }
      offerGroupQuantities[ruleId].totalQty += item.qty;
      offerGroupQuantities[ruleId].totalAmount += item.price * item.qty;
    }
  }

  // 2. Check each product-assigned offer group against global offer rules
  for (const [ruleId, group] of Object.entries(offerGroupQuantities)) {
    const offer = globalOffers.find((o) => o.id === ruleId);
    if (!offer) continue;

    if (group.totalQty >= offer.minQty) {
      highestOfferTitle = offer.title;
      highestOfferRuleId = offer.id;

      if (offer.offerType === "free_delivery") {
        isFreeDelivery = true;
      } else if (offer.offerType === "fixed_discount") {
        totalDiscount += Number(offer.discountAmount) || 0;
      } else if (offer.offerType === "percentage_discount") {
        const pct = (Number(offer.discountAmount) || 0) / 100;
        totalDiscount += Math.round(group.totalAmount * pct);
      }
    }
  }

  // 3. Fallback: If no specific group triggered, check if total quantity matches any global offer rule
  const totalCartQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  if (totalDiscount === 0 && !isFreeDelivery && totalCartQty > 0) {
    for (const offer of globalOffers) {
      if (totalCartQty >= offer.minQty) {
        if (offer.offerType === "free_delivery") {
          isFreeDelivery = true;
          highestOfferTitle = offer.title;
          highestOfferRuleId = offer.id;
          break;
        } else if (offer.offerType === "fixed_discount") {
          totalDiscount = Number(offer.discountAmount) || 0;
          highestOfferTitle = offer.title;
          highestOfferRuleId = offer.id;
          break;
        } else if (offer.offerType === "percentage_discount") {
          const totalItemsAmount = items.reduce((sum, it) => sum + it.price * it.qty, 0);
          const pct = (Number(offer.discountAmount) || 0) / 100;
          totalDiscount = Math.round(totalItemsAmount * pct);
          highestOfferTitle = offer.title;
          highestOfferRuleId = offer.id;
          break;
        }
      }
    }
  }

  return {
    discountAmount: totalDiscount,
    isFreeDelivery,
    appliedOfferTitle: highestOfferTitle,
    appliedOfferRuleId: highestOfferRuleId,
    eligibleQuantity: totalCartQty,
  };
}