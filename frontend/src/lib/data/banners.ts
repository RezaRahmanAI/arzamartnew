import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  position?: string;
  displayOrder: number;
  isActive: boolean;
  eyebrow: string;
}

export function mapPrismaBanner(b: {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  targetUrl: string;
  displayOrder: number;
  isActive: boolean;
  position: string;
}): HeroSlide {
  return {
    id: String(b.id),
    title: b.title,
    subtitle: b.subtitle,
    image: b.imageUrl,
    href: b.targetUrl || "/",
    position: b.position || "slider",
    displayOrder: b.displayOrder,
    isActive: b.isActive,
    eyebrow: "Exclusive Drop",
  };
}

export async function getBanners(position?: string): Promise<HeroSlide[]> {
  try {
    const where: Prisma.BannerWhereInput = { isActive: true };
    if (position) {
      where.position = position;
    }

    const rows = await prisma.banner.findMany({
      where,
      orderBy: { displayOrder: "asc" },
    });

    return rows.map(mapPrismaBanner);
  } catch (error) {
    console.error("getBanners query failed:", error);
    return [];
  }
}
