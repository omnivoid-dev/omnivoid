'use client';

import type { CSSProperties } from 'react';
import { Tint, tintBackground } from '@/lib/branding';

interface TintedImageProps {
  src: string;
  tint: Tint;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  /** width / height; needed for the tinted (masked) render, which has no intrinsic size. */
  aspect?: number;
}

/**
 * Renders an SVG/PNG as-is, or - when a tint is set - as a mask filled with a solid colour or gradient.
 * The image's alpha channel defines the shape, so any transparent SVG or PNG can be recoloured.
 */
export function TintedImage({ src, tint, alt = '', className, style, aspect = 1 }: TintedImageProps) {
  const background = tintBackground(tint);

  if (!background) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} style={style} />;
  }

  const mask = `url("${src}") center / contain no-repeat`;
  return (
    <div
      role="img"
      aria-label={alt}
      className={className}
      style={{
        aspectRatio: String(aspect),
        background,
        mask,
        WebkitMask: mask,
        ...style,
      }}
    />
  );
}
