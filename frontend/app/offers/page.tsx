import { OffersList } from "@/components/offers-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Running Offers & Discounts | Arza",
  description:
    "Live discounts at Arza: bundle deals on tees, linen shirts and panjabi with cash on delivery in Bangladesh.",
};

export default function OffersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="rounded-2xl gradient-sale p-8 text-primary-foreground">
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Limited time</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">
          Exclusive Combo Bundles
        </h1>
        <p className="mt-2 max-w-lg text-sm opacity-90">
          Save big with our hand-picked product combinations. Select sizes and customize your bundle details.
        </p>
      </div>

      <OffersList />
    </div>
  );
}
