import type { CSSProperties, ReactNode } from "react";

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
  const vars = { "--c1": palette[0], "--c2": palette[1], "--c3": palette[2], ...style } as CSSProperties;
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
