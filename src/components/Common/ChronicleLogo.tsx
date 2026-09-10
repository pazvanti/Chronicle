import React, { useId } from 'react';

export interface ChronicleLogoProps {
  size?: number;
  className?: string;
  mode?: 'vector' | 'raster';
  showWordmark?: boolean;
  subtitle?: string;
  glow?: boolean;
}

export const ChronicleLogo: React.FC<ChronicleLogoProps> = ({
  size = 22,
  className = '',
  mode = 'vector',
  showWordmark = false,
  subtitle,
  glow = false,
}) => {
  const uniqueId = useId().replace(/:/g, '');
  const cyanGradId = `chr-cyan-${uniqueId}`;
  const violetGradId = `chr-violet-${uniqueId}`;
  const highlightGradId = `chr-hl-${uniqueId}`;
  const outerGradId = `chr-out-${uniqueId}`;

  const glowStyle: React.CSSProperties = glow
    ? {
        filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.45)) drop-shadow(0 0 16px rgba(168, 85, 247, 0.3))',
      }
    : {};

  const renderIcon = () => {
    if (mode === 'raster') {
      return (
        <img
          src="/chronicle-logo.png"
          alt="Chronicle Logo"
          width={size}
          height={size}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: `${Math.max(4, Math.round(size * 0.22))}px`,
            objectFit: 'cover',
            display: 'block',
            flexShrink: 0,
            ...glowStyle,
          }}
          className={`chronicle-logo-raster ${className}`}
        />
      );
    }

    // High-precision vector emblem: Stylized open manuscript forming the monogram 'C'
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          flexShrink: 0,
          display: 'block',
          ...glowStyle,
        }}
        className={`chronicle-logo-svg ${className}`}
      >
        <defs>
          {/* Cyan to Sky Gradient */}
          <linearGradient id={cyanGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          {/* Indigo to Violet Gradient */}
          <linearGradient id={violetGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="45%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>

          {/* Accent Highlight Gradient */}
          <linearGradient id={highlightGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
          </linearGradient>

          {/* Outer Layer Depth */}
          <linearGradient id={outerGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#6366f1" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* 1. Outer Geometric Hex-Ribbon (Back Layer forming the 'C' cradle) */}
        <path
          d="M32 8L40 12V18L32 14L24 18L16 14L8 18V30L16 34L24 30L32 34V40L24 36L16 40L4 34V14L16 8L24 12L32 8Z"
          fill={`url(#${outerGradId})`}
        />

        {/* 2. Middle Stepped Frame (Outer spine wings) */}
        <path
          d="M34 14L38 16V22L34 20L24 25L14 20L10 22V32L14 34L24 29L34 34V40L24 35L14 40L6 36V18L14 14L24 19L34 14Z"
          fill={`url(#${violetGradId})`}
          opacity="0.85"
        />

        {/* 3. Left Page (Crisp open book facet) */}
        <path
          d="M12 12L24 18V38L12 32V12Z"
          fill={`url(#${cyanGradId})`}
        />

        {/* Left Page Highlight Sheen */}
        <path
          d="M12 12L24 18V28L12 22V12Z"
          fill={`url(#${highlightGradId})`}
        />

        {/* 4. Right Page (Sweeping inward curve forming the central 'C' cavity) */}
        <path
          d="M24 18L38 12V24L30 20C26 23 26 27 30 30L38 26V38L24 38V18Z"
          fill={`url(#${violetGradId})`}
        />

        {/* 5. Center Spine Notch / Bookmark Jewel */}
        <path
          d="M24 18L26.5 22L24 25L21.5 22L24 18Z"
          fill="#ffffff"
          opacity="0.95"
        />

        {/* Crest Spark */}
        <circle cx="24" cy="18" r="1.5" fill="#ffffff" />
      </svg>
    );
  };

  if (!showWordmark) {
    return renderIcon();
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.65rem',
        textDecoration: 'none',
        userSelect: 'none',
      }}
      className={`chronicle-brand-group ${className}`}
    >
      {renderIcon()}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span
          style={{
            fontSize: `${Math.max(14, Math.round(size * 0.72))}px`,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 55%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Chronicle
        </span>
        {subtitle && (
          <span
            style={{
              fontSize: `${Math.max(9, Math.round(size * 0.38))}px`,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--accent-cyan, #38bdf8)',
              marginTop: '2px',
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
export default ChronicleLogo;
