"use client";

import { LandingSection, CustomField } from "@/lib/api/services/custom-landing-page.service";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { getImageUrl, handleImageError } from "@/lib/utils";

interface CustomSectionRendererProps {
  section: LandingSection;
  onScrollToOrder?: () => void;
}

export function CustomSectionRenderer({ section, onScrollToOrder }: CustomSectionRendererProps) {
  if (!section.customFields || section.customFields.length === 0) return null;

  const getField = (key: string): CustomField | undefined => {
    return section.customFields?.find((f) => f.key === key && f.enabled);
  };

  const getFieldValue = (key: string): string => {
    const f = getField(key);
    return f?.value ? String(f.value) : "";
  };

  const getImagesList = (): string[] => {
    const field = getField("images");
    if (!field || !Array.isArray(field.value)) return [];
    return field.value.filter((img) => typeof img === "string" && img.trim().length > 0);
  };

  const getFeatures = (): string[] => {
    const field = getField("features");
    if (!field || !field.value) return [];
    return String(field.value)
      .split("\n")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  const handleButtonClick = () => {
    if (onScrollToOrder) {
      onScrollToOrder();
    } else {
      const orderForm = document.getElementById("order-form");
      if (orderForm) {
        orderForm.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const layoutType = section.settings?.layoutType || "A";

  return (
    <section className="py-10 px-4 md:px-8 border-b border-border/40 bg-card text-card-foreground">
      <div className="max-w-4xl mx-auto">
        {/* Layout A: Title + Subtitle + Big Image */}
        {layoutType === "A" && (
          <div className="text-center space-y-5">
            {getField("title") && getFieldValue("title") && (
              <h2 className="text-2xl md:text-3xl font-black text-foreground whitespace-pre-line tracking-tight">
                {getFieldValue("title")}
              </h2>
            )}
            {getField("subtitle") && getFieldValue("subtitle") && (
              <p className="text-sm md:text-base text-muted-foreground whitespace-pre-line leading-relaxed max-w-2xl mx-auto">
                {getFieldValue("subtitle")}
              </p>
            )}
            {getField("image") && getFieldValue("image") && (
              <div className="pt-2">
                <img
                  src={getImageUrl(getFieldValue("image"))}
                  alt="Section banner"
                  className="w-full max-w-2xl mx-auto rounded-2xl shadow-xl border border-border object-cover"
                  loading="lazy"
                  onError={handleImageError}
                />
              </div>
            )}
            {getField("button") && getFieldValue("button") && (
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleButtonClick}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all text-base cursor-pointer"
                >
                  <span>{getFieldValue("button")}</span>
                  <ArrowRight className="size-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Layout B: Title + Rich Text + Button */}
        {layoutType === "B" && (
          <div className="space-y-6">
            {getField("title") && getFieldValue("title") && (
              <h2 className="text-2xl md:text-3xl font-black text-center text-foreground whitespace-pre-line tracking-tight">
                {getFieldValue("title")}
              </h2>
            )}
            {getField("richtext") && getFieldValue("richtext") && (
              <div className="text-sm md:text-base text-foreground/90 leading-relaxed whitespace-pre-line bg-muted/20 p-6 rounded-2xl border border-border">
                {getFieldValue("richtext")}
              </div>
            )}
            {getField("button") && getFieldValue("button") && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleButtonClick}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all text-base cursor-pointer"
                >
                  <span>{getFieldValue("button")}</span>
                  <ArrowRight className="size-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Layout C: Title + Images Grid */}
        {layoutType === "C" && (
          <div className="space-y-6">
            {getField("title") && getFieldValue("title") && (
              <h2 className="text-2xl md:text-3xl font-black text-center text-foreground whitespace-pre-line tracking-tight">
                {getFieldValue("title")}
              </h2>
            )}
            {getImagesList().length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {getImagesList().map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-xl overflow-hidden bg-muted border border-border group"
                  >
                    <img
                      src={getImageUrl(imgUrl)}
                      alt={`Gallery item ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={handleImageError}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Layout D: Title + Feature Cards */}
        {layoutType === "D" && (
          <div className="space-y-6">
            {getField("title") && getFieldValue("title") && (
              <h2 className="text-2xl md:text-3xl font-black text-center text-foreground whitespace-pre-line tracking-tight">
                {getFieldValue("title")}
              </h2>
            )}
            {getFeatures().length > 0 && (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {getFeatures().map((feature, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-muted/40 rounded-xl border border-border hover:border-primary/40 transition-colors text-center flex flex-col items-center gap-3"
                  >
                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                      {idx + 1}
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-relaxed">
                      {feature}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Layout E: Title + Text + Image + Button */}
        {layoutType === "E" && (
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-5">
              {getField("title") && getFieldValue("title") && (
                <h2 className="text-2xl md:text-3xl font-black text-foreground whitespace-pre-line tracking-tight leading-tight">
                  {getFieldValue("title")}
                </h2>
              )}
              {getField("description") && getFieldValue("description") && (
                <p className="text-sm md:text-base text-muted-foreground whitespace-pre-line leading-relaxed">
                  {getFieldValue("description")}
                </p>
              )}
              {getField("button") && getFieldValue("button") && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleButtonClick}
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-7 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm md:text-base cursor-pointer"
                  >
                    <span>{getFieldValue("button")}</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              )}
            </div>

            {getField("image") && getFieldValue("image") && (
              <div className="rounded-2xl overflow-hidden bg-muted border border-border shadow-md">
                <img
                  src={getImageUrl(getFieldValue("image"))}
                  alt="Section showcase"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                  onError={handleImageError}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
