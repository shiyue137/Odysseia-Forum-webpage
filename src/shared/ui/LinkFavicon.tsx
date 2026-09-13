import { useMemo, useState } from "react";
import { parseHttpUrl } from "@/shared/lib/urlSafety";

interface LinkFaviconProps {
  href: string;
  className?: string;
}

export function LinkFavicon({ href, className = "" }: LinkFaviconProps) {
  const [failed, setFailed] = useState(false);
  const faviconUrl = useMemo(() => {
    const parsed = parseHttpUrl(href);
    if (!parsed) return null;
    return `${parsed.origin}/favicon.ico`;
  }, [href]);

  if (!faviconUrl || failed) return null;

  return (
    <img
      src={faviconUrl}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={`inline-block h-3.5 w-3.5 shrink-0 rounded-sm object-contain align-[-0.15em] ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
