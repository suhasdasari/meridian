"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function StoryImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn("story-img object-cover", className)}
      onError={() => setFailed(true)}
    />
  );
}
