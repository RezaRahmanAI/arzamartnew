import { NewArrivalsList } from "@/components/new-arrivals-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Arrivals | Arza",
  description:
    "Explore the latest fashion arrivals at Arza. Premium quality tees, shirts, panjabi and casual wear with cash on delivery across Bangladesh.",
};

export default function NewArrivalsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="rounded-2xl bg-secondary/50 border border-border p-8 text-foreground">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Latest Drops</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">
          New Arrivals
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Discover our freshest collections and newest product additions designed for everyday comfort and style.
        </p>
      </div>

      <NewArrivalsList />
    </div>
  );
}
