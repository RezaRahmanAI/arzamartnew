import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { apiClient } from "@/lib/api/client";

interface ImageUploaderProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  sublabel?: string;
  size?: "sm" | "md" | "lg";
}

export function ImageUploader({
  value,
  onChange,
  label,
  sublabel,
  size = "md"
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
      const res = await apiClient.uploadFile(file, "uploads");
      if (res && res.url) {
        onChange(res.url);
      } else {
        throw new Error("Invalid response");
      }
    } catch {
      // Fallback to base64 Data URL if offline or upload endpoint unavailable
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs font-semibold">{label}</label>}
      <div className="flex items-center gap-3">
        {value ? (
          <div className={`relative rounded-md border border-border overflow-hidden group ${sizeClasses[size]}`}>
            <img src={value} alt={label || "Preview"} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold cursor-pointer"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className={`flex flex-col items-center justify-center rounded-md border border-dashed border-border hover:border-primary bg-secondary/10 cursor-pointer text-muted-foreground hover:text-foreground transition-colors ${sizeClasses[size]}`}>
            {isUploading ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <>
                <Upload className="size-3.5" />
                <span className="text-[8px] mt-1 font-semibold uppercase tracking-wider">Upload</span>
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
        )}
        {sublabel && (
          <div className="text-[11px] text-muted-foreground leading-tight max-w-[200px]">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
