import { apiClient } from "../client";
import { apiConfig } from "../config";
import heroSummerImg from "@/assets/hero-summer.jpg";
import heroTeesImg from "@/assets/hero-tees.jpg";

const heroSummer = typeof heroSummerImg === "string" ? heroSummerImg : heroSummerImg.src;
const heroTees = typeof heroTeesImg === "string" ? heroTeesImg : heroTeesImg.src;

export interface RawApiBanner {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  targetUrl: string;
  displayOrder: number;
  isActive: boolean;
  position?: string;
}

export type HeroSlide = {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
  displayOrder?: number;
  isActive?: boolean;
  position?: string;
};

const BANNERS_KEY = "arza_hero_banners_v1";

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
  private getLocalSlides(): HeroSlide[] {
    if (typeof window === "undefined") return initialMockSlides;
    try {
      const raw = window.localStorage.getItem(BANNERS_KEY);
      return raw ? JSON.parse(raw) : initialMockSlides;
    } catch {
      return initialMockSlides;
    }
  }

  private saveLocalSlides(slides: HeroSlide[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(BANNERS_KEY, JSON.stringify(slides));
    } catch {
      /* ignore */
    }
  }

  public async getAll(): Promise<HeroSlide[]> {
    if (apiConfig.useMockData) {
      return this.getLocalSlides();
    }
    try {
      const banners = await apiClient.get<RawApiBanner[]>("/banners");
      if (Array.isArray(banners) && banners.length > 0) {
        return banners.map((b) => ({
          id: b.id.toString(),
          image: b.imageUrl || heroSummer,
          eyebrow: b.position === "offer" ? "Limited time" : b.displayOrder === 1 ? "New arrival" : "Featured",
          title: b.title,
          subtitle: b.subtitle,
          href: b.targetUrl || "/category/shirts",
          displayOrder: b.displayOrder,
          isActive: b.isActive,
          position: b.position || (b.targetUrl === "/offers" ? "offer" : "slider"),
        }));
      }
      return this.getLocalSlides();
    } catch (err) {
      console.warn("Failed to fetch banners from API, using fallback slides:", err);
      return this.getLocalSlides();
    }
  }

  public async create(slide: Omit<HeroSlide, "id">): Promise<HeroSlide> {
    if (apiConfig.useMockData) {
      const slides = this.getLocalSlides();
      const newSlide: HeroSlide = { ...slide, id: Date.now().toString() };
      const updated = [newSlide, ...slides];
      this.saveLocalSlides(updated);
      return newSlide;
    }
    try {
      const created = await apiClient.post<RawApiBanner>("/banners", {
        title: slide.title,
        subtitle: slide.subtitle,
        imageUrl: slide.image,
        targetUrl: slide.href,
        displayOrder: slide.displayOrder ?? 1,
        isActive: slide.isActive ?? true,
      });
      return {
        id: created.id.toString(),
        image: created.imageUrl,
        eyebrow: slide.eyebrow,
        title: created.title,
        subtitle: created.subtitle,
        href: created.targetUrl,
        displayOrder: created.displayOrder,
        isActive: created.isActive,
      };
    } catch (err) {
      console.warn("API banner creation failed, saving locally:", err);
      const slides = this.getLocalSlides();
      const newSlide: HeroSlide = { ...slide, id: Date.now().toString() };
      this.saveLocalSlides([newSlide, ...slides]);
      return newSlide;
    }
  }

  public async update(id: string, updated: Partial<HeroSlide>): Promise<HeroSlide> {
    if (apiConfig.useMockData) {
      const slides = this.getLocalSlides();
      const list = slides.map((s) => (s.id === id ? { ...s, ...updated } : s));
      this.saveLocalSlides(list);
      return list.find((s) => s.id === id)!;
    }
    try {
      const numId = parseInt(id);
      const result = await apiClient.put<RawApiBanner>(`/banners/${numId}`, {
        title: updated.title,
        subtitle: updated.subtitle,
        imageUrl: updated.image,
        targetUrl: updated.href,
        displayOrder: updated.displayOrder ?? 1,
        isActive: updated.isActive ?? true,
      });
      return {
        id: result.id.toString(),
        image: result.imageUrl,
        eyebrow: updated.eyebrow || "Featured",
        title: result.title,
        subtitle: result.subtitle,
        href: result.targetUrl,
        displayOrder: result.displayOrder,
        isActive: result.isActive,
      };
    } catch (err) {
      console.warn("API banner update failed, updating locally:", err);
      const slides = this.getLocalSlides();
      const list = slides.map((s) => (s.id === id ? { ...s, ...updated } : s));
      this.saveLocalSlides(list);
      return list.find((s) => s.id === id)!;
    }
  }

  public async delete(id: string): Promise<void> {
    if (apiConfig.useMockData) {
      const slides = this.getLocalSlides();
      const list = slides.filter((s) => s.id !== id);
      this.saveLocalSlides(list);
      return;
    }
    try {
      const numId = parseInt(id);
      await apiClient.delete<void>(`/banners/${numId}`);
    } catch (err) {
      console.warn("API banner deletion failed, deleting locally:", err);
      const slides = this.getLocalSlides();
      this.saveLocalSlides(slides.filter((s) => s.id !== id));
    }
  }
}

export const bannersService = new BannersService();
