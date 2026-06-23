import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
  aspectRatio?: string;
}

/** Lazy-loaded image with skeleton placeholder. */
export function LazyImage({
  src,
  alt,
  priority = false,
  aspectRatio,
  className,
  style,
  ...rest
}: LazyImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(priority);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (priority || visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [priority, visible]);

  return (
    <img
      ref={ref}
      src={visible ? src : undefined}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      style={{ aspectRatio, ...style }}
      className={cn(
        "transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0 bg-muted animate-pulse",
        className,
      )}
      {...rest}
    />
  );
}