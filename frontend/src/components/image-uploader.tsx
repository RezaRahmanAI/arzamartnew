import { useState } from "react";
import { Loader2, Upload, Trash2, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { apiConfig } from "@/lib/api/config";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { getImageUrl, FALLBACK_IMAGE, handleImageError } from "@/lib/utils";
export { getImageUrl, FALLBACK_IMAGE, handleImageError };

interface ImageUploaderProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  sublabel?: string;
  size?: "sm" | "md" | "lg";
  folder?: string;
}

export function ImageUploader({
  value,
  onChange,
  label,
  sublabel,
  size = "md",
  folder = "uploads"
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const sizeClasses = {
    sm: "size-10",
    md: "size-16",
    lg: "size-20"
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await apiClient.uploadFile(file, folder);
      if (res && res.url) {
        onChange(res.url);
        if (res.compressionRatio && res.compressionRatio > 0) {
          toast.success(`Image auto-optimized to WebP (${res.compressionRatio}% size reduced)!`);
        } else {
          toast.success("Image uploaded and optimized!");
        }
      } else {
        throw new Error("Invalid response");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload and optimize image");
    } finally {
      setIsUploading(false);
    }
  };

  const previewSrc = getImageUrl(value, "thumb");

  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-semibold">{label}</label>}
      <div className="flex items-center gap-3">
        {value && (
          <div className={`relative rounded-md border border-border overflow-hidden shrink-0 bg-muted/20 ${sizeClasses[size]}`}>
            <img
              src={previewSrc}
              alt=""
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
              className="size-full object-cover"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className={`flex flex-col items-center justify-center rounded-md border border-dashed border-border hover:border-primary bg-secondary/10 cursor-pointer text-muted-foreground hover:text-foreground transition-colors shrink-0 ${sizeClasses[size]}`}>
            {isUploading ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <>
                <Upload className="size-3.5" />
                <span className="text-[8px] mt-1 font-semibold uppercase tracking-wider">
                  {value ? "Change" : "Upload"}
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={isUploading}
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {value && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
              onClick={() => onChange("")}
              title="Remove image"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>

        {sublabel && (
          <div className="text-[11px] text-muted-foreground leading-tight max-w-[200px]">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
