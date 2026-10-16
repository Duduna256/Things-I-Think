import type { CSSProperties, ReactNode } from "react";
import { safePalette } from "@/lib/format";

// The venue picture. Until a business uploads a photo it's a gradient in their three
// colours with one big italic word ("braids", "fade", "I do").
export function Cover({
  palette,
  word,
  imageUrl,
  badge,
  className = "",
  style,
}: {
  palette: [string, string, string];
  word: string;
  imageUrl?: string | null;
  badge?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const [c1, c2, c3] = safePalette(palette);
  const vars = { "--c1": c1, "--c2": c2, "--c3": c3, ...style } as CSSProperties;
  return (
    <div className={`cover ${className}`} style={vars}>
      {badge}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" loading="lazy" />
      ) : (
        <span className="cover-word" aria-hidden="true">
          {word}
        </span>
      )}
    </div>
  );
}
