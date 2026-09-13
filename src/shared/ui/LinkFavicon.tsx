import { useMemo, useState } from "react";
import { isTrustedDiscordHostname, parseHttpUrl } from "@/shared/lib/urlSafety";
import { DiscordIcon } from "@/shared/ui/icons/DiscordIcon";

interface LinkFaviconProps {
  href: string;
  className?: string;
}

export function LinkFavicon({ href, className = "" }: LinkFaviconProps) {
  const [failed, setFailed] = useState(false);
  const parsedUrl = useMemo(() => {
    const parsed = parseHttpUrl(href);
    return parsed;
  }, [href]);

  if (!parsedUrl) return null;
  if (isTrustedDiscordHostname(parsedUrl.hostname)) {
    return <DiscordIcon aria-hidden="true" className={`inline-block h-3.5 w-3.5 shrink-0 align-[-0.15em] ${className}`} />;
  }
  if (failed) return null;

  return (
    <img
      src={`${parsedUrl.origin}/favicon.ico`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={`inline-block h-3.5 w-3.5 shrink-0 rounded-sm object-contain align-[-0.15em] ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
