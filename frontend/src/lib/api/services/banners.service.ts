import heroSummerImg from "@/assets/hero-summer.jpg";
import heroTeesImg from "@/assets/hero-tees.jpg";
import {
  getBannersAction,
  createBannerAction,
  updateBannerAction,
  deleteBannerAction,
} from "@/actions/banners.actions";

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

const heroSummer = typeof heroSummerImg === "string" ? heroSummerImg : heroSummerImg.src;
const heroTees = typeof heroTeesImg === "string" ? heroTeesImg : heroTeesImg.src;

export const initialMockSlides: HeroSlide[] = [
  {
    id: "slide_default_1",
    image: heroSummer,
    eyebrow: "New Arrival",
    title: "Summer Collection",
    subtitle: "Breathable fabrics designed for modern comfort",
    href: "/category/shirts",
    displayOrder: 1,
    isActive: true,
    position: "slider",
  },
  {
    id: "slide_default_2",
    image: heroTees,
    eyebrow: "Popular",
    title: "Heavyweight Tees",
    subtitle: "Premium 220 GSM cotton t-shirts for everyday wear",
    href: "/category/t-shirts",
    displayOrder: 2,
    isActive: true,
    position: "slider",
  },
];

class BannersService {
  public async getAll(): Promise<HeroSlide[]> {
    try {
      const banners = await getBannersAction();
      if (banners && banners.length > 0) return banners;
      return initialMockSlides;
    } catch {
      return initialMockSlides;
    }
  }

  public async create(slide: Omit<HeroSlide, "id">): Promise<HeroSlide> {
    const res = await createBannerAction({
      title: slide.title,
      subtitle: slide.subtitle,
      image: slide.image,
      href: slide.href,
      position: slide.position,
      displayOrder: slide.displayOrder,
      isActive: slide.isActive,
    });

    if (!res.success || !res.banner) {
      throw new Error(res.error || "Failed to create banner");
    }
    return res.banner;
  }

  public async update(id: string, updated: Partial<HeroSlide>): Promise<HeroSlide> {
    const res = await updateBannerAction(id, {
      title: updated.title,
      subtitle: updated.subtitle,
      image: updated.image,
      href: updated.href,
      position: updated.position,
      displayOrder: updated.displayOrder,
      isActive: updated.isActive,
    });

    if (!res.success || !res.banner) {
      throw new Error(res.error || "Failed to update banner");
    }
    return res.banner;
  }

  public async delete(id: string): Promise<void> {
    const res = await deleteBannerAction(id);
    if (!res.success) {
      throw new Error(res.error || "Failed to delete banner");
    }
  }
}

export const bannersService = new BannersService();
