import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { FALLBACK_IMAGE } from "@/lib/utils";

type OptImageProps = Omit<ImageProps, "onError"> & {
  fallbackSrc?: string;
};

export function OptImage({ src, fallbackSrc = FALLBACK_IMAGE, alt, ...props }: OptImageProps) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <Image
      src={imgSrc}
      alt={alt || ""}
      onError={() => {
        if (imgSrc !== fallbackSrc) setImgSrc(fallbackSrc);
      }}
      {...props}
    />
  );
}
