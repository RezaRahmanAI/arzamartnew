"use client";

import { useState } from "react";
import { Plus, Trash2, Edit3, Image as ImageIcon, Eye, EyeOff, Link as LinkIcon, MoveUp, MoveDown } from "lucide-react";
import { useBanners } from "@/lib/banners-store";
import { type HeroSlide } from "@/lib/api/services/banners.service";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader, getImageUrl, handleImageError } from "@/components/image-uploader";
import { OptImage } from "@/components/opt-image";

export default function AdminBannersPage() {
  const { slides, isLoading, addSlide, updateSlide, deleteSlide } = useBanners();
  const [isOpen, setIsOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    eyebrow: "New Arrival",
    image: "",
    href: "/category/shirts",
    displayOrder: 1,
    isActive: true,
  });

  const handleOpenCreate = () => {
    setEditingSlide(null);
    setFormData({
      title: "",
      subtitle: "",
      eyebrow: "New Arrival",
      image: "",
      href: "/category/shirts",
      displayOrder: slides.length + 1,
      isActive: true,
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title,
      subtitle: slide.subtitle,
      eyebrow: slide.eyebrow,
      image: slide.image,
      href: slide.href,
      displayOrder: slide.displayOrder ?? 1,
      isActive: slide.isActive !== false,
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.image) return;

    if (editingSlide) {
      await updateSlide(editingSlide.id, formData);
    } else {
      await addSlide(formData);
    }
    setIsOpen(false);
  };

  const toggleActive = async (slide: HeroSlide) => {
    await updateSlide(slide.id, { isActive: !(slide.isActive !== false) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground">Homepage Hero Slides</h2>
          <p className="text-sm text-muted-foreground">
            Manage banner images, headlines, and call-to-action links shown on the main hero slider.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 font-bold cursor-pointer shrink-0">
          <Plus className="size-4" />
          Add New Slide
        </Button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse">Loading hero slides...</div>
      ) : slides.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border">
          <ImageIcon className="size-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No Hero Banners Found</h3>
          <p className="text-sm text-muted-foreground mt-1">Click "Add New Slide" above to create your first hero banner.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card shadow-card transition-all ${
                slide.isActive === false ? "opacity-60 border-destructive/40" : "border-border"
              }`}
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
                <OptImage
                  src={getImageUrl(slide.image)}
                  alt={slide.title}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  width={400}
                  height={225}
                  sizes="(max-width: 768px) 100vw, 400px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur-sm">
                    Order: {slide.displayOrder ?? 1}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase backdrop-blur-sm ${
                      slide.isActive !== false ? "bg-emerald-500/80 text-white" : "bg-destructive/80 text-white"
                    }`}
                  >
                    {slide.isActive !== false ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    {slide.eyebrow}
                  </span>
                  <h3 className="font-display text-lg font-bold leading-tight">{slide.title}</h3>
                  <p className="text-xs text-white/80 line-clamp-1">{slide.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 p-3 bg-card border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                  <LinkIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{slide.href}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleActive(slide)}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    title={slide.isActive !== false ? "Disable Slide" : "Enable Slide"}
                  >
                    {slide.isActive !== false ? <Eye className="size-4 text-emerald-500" /> : <EyeOff className="size-4 text-muted-foreground" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(slide)}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                    title="Edit Slide"
                  >
                    <Edit3 className="size-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteSlide(slide.id)}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    title="Delete Slide"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSlide ? "Edit Hero Slide" : "Create Hero Slide"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Headline Title</Label>
              <Input
                id="title"
                placeholder="e.g. Summer, sorted"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subtitle">Subtitle / Description</Label>
              <Input
                id="subtitle"
                placeholder="e.g. Breathable linen shirts made for Dhaka heat."
                value={formData.subtitle}
                onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="eyebrow">Badge Label</Label>
                <Input
                  id="eyebrow"
                  placeholder="e.g. New arrival"
                  value={formData.eyebrow}
                  onChange={(e) => setFormData((prev) => ({ ...prev, eyebrow: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min={1}
                  value={formData.displayOrder}
                  onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>

            <ImageUploader
              label="Banner Image"
              value={formData.image}
              onChange={(val) => setFormData((prev) => ({ ...prev, image: val }))}
              folder="banners"
              sublabel="Upload slide image or enter URL. Recommended: 1600x900 PNG/JPG/WEBP"
            />

            <div className="space-y-1.5">
              <Label htmlFor="href">Target Button Link (href)</Label>
              <Input
                id="href"
                placeholder="/category/shirts"
                value={formData.href}
                onChange={(e) => setFormData((prev) => ({ ...prev, href: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="size-4 rounded border-border"
              />
              <Label htmlFor="isActive" className="cursor-pointer font-semibold text-sm">
                Active on Storefront
              </Label>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="font-bold">
                {editingSlide ? "Save Changes" : "Create Slide"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
