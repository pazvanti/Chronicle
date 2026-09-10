import React, { useState, useRef, useMemo } from 'react';
import { useEpub } from '../../context/EpubContext';
import { escapeXml } from '../../services/epub/htmlUtils';
import {
  Upload,
  Sparkles,
  Image as ImageIcon,
  Check,
  Palette,
  Feather,
  Book,
  BookOpen,
  Compass,
  Moon,
  Shield,
  Crown,
  Star,
  Download,
  Layout,
  Type,
  Flame,
  Key,
  Hourglass,
  Trees,
  Mountain,
  Eye,
  Trash2,
  Info,
} from 'lucide-react';

interface GradientPreset {
  id: string;
  name: string;
  c1: string;
  c2: string;
  c3?: string;
  angle: number;
}

const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'cosmic', name: 'Cosmic Indigo', c1: '#0b0f19', c2: '#1e1b4b', c3: '#312e81', angle: 135 },
  { id: 'crimson', name: 'Crimson Ember', c1: '#360606', c2: '#7f1d1d', c3: '#991b1b', angle: 145 },
  { id: 'emerald', name: 'Emerald Forest', c1: '#022c22', c2: '#064e3b', c3: '#065f46', angle: 135 },
  { id: 'amethyst', name: 'Royal Velvet', c1: '#2e1065', c2: '#581c87', c3: '#701a75', angle: 140 },
  { id: 'gold', name: 'Golden Hour', c1: '#451a03', c2: '#78350f', c3: '#b45309', angle: 135 },
  { id: 'ocean', name: 'Deep Oceanic', c1: '#082f49', c2: '#0369a1', c3: '#0284c7', angle: 150 },
  { id: 'cyber', name: 'Cyberpunk Rose', c1: '#18181b', c2: '#831843', c3: '#be185d', angle: 135 },
  { id: 'noir', name: 'Obsidian Noir', c1: '#09090b', c2: '#18181b', c3: '#27272a', angle: 180 },
];

export const CoverStudio: React.FC = () => {
  const { book, updateCoverImage, generateCustomCover, showNotification } = useEpub();
  const directFileInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  // Top level mode: Direct Image Upload vs Designer Studio
  const [mainMode, setMainMode] = useState<'current' | 'designer'>(book?.coverImageUrl ? 'current' : 'designer');

  // Sub-tab for Designer tools
  const [designerSubTab, setDesignerSubTab] = useState<'text' | 'bg' | 'emblem' | 'frame'>('text');

  // Background state
  const [bgType, setBgType] = useState<'gradient' | 'image'>('gradient');
  const [bgGradColor1, setBgGradColor1] = useState<string>('#0b0f19');
  const [bgGradColor2, setBgGradColor2] = useState<string>('#1e1b4b');
  const [bgGradAngle, setBgGradAngle] = useState<number>(135);
  const [bgImageBase64, setBgImageBase64] = useState<string | null>(null);
  const [bgOverlayOpacity, setBgOverlayOpacity] = useState<number>(0.65);
  const [bgRadialGlow, setBgRadialGlow] = useState<boolean>(true);
  const [bgGlowColor, setBgGlowColor] = useState<string>('#818cf8');

  // Frame state
  const [frameStyle, setFrameStyle] = useState<'classic' | 'modern' | 'vintage' | 'minimal' | 'none'>('classic');
  const [frameColor, setFrameColor] = useState<string>('#818cf8');
  const [frameOpacity, setFrameOpacity] = useState<number>(0.75);

  // Main Title state
  const [titleText, setTitleText] = useState<string>(book?.metadata.title || 'Book Title');
  const [titleFontFamily, setTitleFontFamily] = useState<'serif' | 'cinzel' | 'sans' | 'playfair' | 'mono'>('cinzel');
  const [titleFontSize, setTitleFontSize] = useState<number>(38);
  const [titlePosY, setTitlePosY] = useState<number>(270);
  const [titleColorType, setTitleColorType] = useState<'solid' | 'gradient'>('gradient');
  const [titleSolidColor, setTitleSolidColor] = useState<string>('#ffffff');
  const [titleGradColor1, setTitleGradColor1] = useState<string>('#ffffff');
  const [titleGradColor2, setTitleGradColor2] = useState<string>('#c7d2fe');
  const [titleLetterSpacing, setTitleLetterSpacing] = useState<number>(2);
  const [titleShadow, setTitleShadow] = useState<boolean>(true);

  // Author state
  const [authorText, setAuthorText] = useState<string>(book?.metadata.creator || 'Author Name');
  const [authorFontSize, setAuthorFontSize] = useState<number>(16);
  const [authorPosY, setAuthorPosY] = useState<number>(140);
  const [authorColor, setAuthorColor] = useState<string>('#c7d2fe');
  const [authorLetterSpacing, setAuthorLetterSpacing] = useState<number>(4);
  const [authorUppercase, setAuthorUppercase] = useState<boolean>(true);

  // Subtitle state
  const [subtitleText, setSubtitleText] = useState<string>('Classic Edition');
  const [subtitleFontSize, setSubtitleFontSize] = useState<number>(15);
  const [subtitlePosY, setSubtitlePosY] = useState<number>(370);
  const [subtitleColor, setSubtitleColor] = useState<string>('#a5b4fc');

  // Tagline state
  const [taglineText, setTaglineText] = useState<string>('SPECIAL EPUB EDITION');
  const [taglineFontSize, setTaglineFontSize] = useState<number>(12);
  const [taglinePosY, setTaglinePosY] = useState<number>(780);
  const [taglineColor, setTaglineColor] = useState<string>('#818cf8');

  // Emblem state
  const [selectedIcon, setSelectedIcon] = useState<string>('compass');
  const [emblemPosY, setEmblemPosY] = useState<number>(510);
  const [emblemScale, setEmblemScale] = useState<number>(3.2);
  const [emblemColor, setEmblemColor] = useState<string>('#818cf8');
  const [emblemGlow, setEmblemGlow] = useState<boolean>(true);


  // Handle Direct Cover File Upload (Raw untouched image)
  const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateCoverImage(file);
      showNotification('success', `Directly applied "${file.name}" as book cover!`);
    }
  };

  const handleDirectDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      updateCoverImage(file);
      showNotification('success', `Directly applied "${file.name}" as book cover!`);
    }
  };

  // Download raw current cover image
  const handleDownloadCurrentCover = () => {
    if (!book?.coverImageUrl) return;
    const a = document.createElement('a');
    a.href = book.coverImageUrl;
    const cleanTitle = (book.metadata?.title || 'book_cover').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${cleanTitle}_cover`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Load existing cover image into the designer background
  const handleLoadCoverIntoDesigner = () => {
    if (book?.coverImageUrl) {
      setBgImageBase64(book.coverImageUrl);
      setBgType('image');
      setMainMode('designer');
      setDesignerSubTab('bg');
      showNotification('info', 'Loaded current cover into designer as background layer!');
    }
  };

  function wrapSvgText(text: string, maxCharsPerLine = 16): string[] {
    const clean = text.trim();
    if (!clean) return ['Untitled Book'];
    const words = clean.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      if ((current + ' ' + word).trim().length <= maxCharsPerLine) {
        current = (current + ' ' + word).trim();
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // Handle Background Image Upload inside Designer
  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setBgImageBase64(reader.result as string);
        setBgType('image');
      };
      reader.readAsDataURL(file);
    }
  };

  // Emblem vector paths
  const getEmblemSvgPath = (iconName: string, color: string) => {
    switch (iconName) {
      case 'book':
        return `<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" stroke="${color}" stroke-width="2.2" fill="none"/>
                <path d="M6 6h10M6 10h10M6 14h6" stroke="${color}" stroke-width="1.8"/>`;
      case 'bookopen':
        return `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke="${color}" stroke-width="2.2" fill="none"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="${color}" stroke-width="2.2" fill="none"/>`;
      case 'quill':
        return `<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" stroke="${color}" stroke-width="2.2" fill="none"/>
                <line x1="16" y1="8" x2="2" y2="22" stroke="${color}" stroke-width="2.2"/>
                <line x1="17.5" y1="15" x2="9" y2="15" stroke="${color}" stroke-width="1.6"/>`;
      case 'compass':
        return `<circle cx="12" cy="12" r="10" stroke="${color}" stroke-width="2.2" fill="none"/>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" stroke="${color}" stroke-width="1.8" fill="${color}" fill-opacity="0.35"/>`;
      case 'moon':
        return `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="${color}" stroke-width="2.2" fill="${color}" fill-opacity="0.25"/>`;
      case 'shield':
        return `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="${color}" stroke-width="2.2" fill="${color}" fill-opacity="0.25"/>`;
      case 'crown':
        return `<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" stroke="${color}" stroke-width="2.2" fill="${color}" fill-opacity="0.25"/>`;
      case 'star':
        return `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="${color}" stroke-width="2.2" fill="${color}" fill-opacity="0.35"/>`;
      case 'flame':
        return `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z" stroke="${color}" stroke-width="2.2" fill="${color}" fill-opacity="0.25"/>`;
      case 'key':
        return `<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" stroke="${color}" stroke-width="2.2" fill="none"/>
                <circle cx="7.5" cy="15.5" r="5.5" stroke="${color}" stroke-width="2.2" fill="none"/>`;
      case 'hourglass':
        return `<path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" stroke="${color}" stroke-width="2.2" fill="${color}" fill-opacity="0.2"/>`;
      case 'trees':
        return `<path d="M10 10v.2A3 3 0 0 1 8.9 16v0H5v0h0a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z" stroke="${color}" stroke-width="2" fill="none"/>
                <path d="M7 16v6M17 14v8" stroke="${color}" stroke-width="2"/>
                <path d="M17 6v.3A4 4 0 0 1 15 14h6a4 4 0 0 1-2-7.7V6a4 4 0 0 1-2-3.7A4 4 0 0 1 17 6Z" stroke="${color}" stroke-width="2" fill="none"/>`;
      case 'mountain':
        return `<path d="m8 3 4 8 5-5 5 15H2L8 3z" stroke="${color}" stroke-width="2.2" fill="${color}" fill-opacity="0.25"/>`;
      case 'eye':
        return `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" stroke="${color}" stroke-width="2.2" fill="none"/>
                <circle cx="12" cy="12" r="3" stroke="${color}" stroke-width="2.2" fill="${color}" fill-opacity="0.4"/>`;
      default:
        return '';
    }
  };

  // Build Full SVG
  const generatedSvg = useMemo(() => {
    const fontMapping: Record<string, string> = {
      cinzel: "'Cinzel', 'Times New Roman', 'Georgia', serif",
      serif: "'Georgia', 'Merriweather', serif",
      sans: "'Outfit', 'Inter', -apple-system, sans-serif",
      playfair: "'Playfair Display', 'Georgia', serif",
      mono: "'Fira Code', 'Courier New', monospace",
    };
    const titleFont = fontMapping[titleFontFamily] || fontMapping.cinzel;

    const titleLines = wrapSvgText(titleText || 'Book Title', 16);

    let frameMarkup = '';
    if (frameStyle === 'classic') {
      frameMarkup = `
        <rect x="30" y="30" width="540" height="840" rx="8" fill="none" stroke="${frameColor}" stroke-width="2" stroke-opacity="${frameOpacity}"/>
        <rect x="42" y="42" width="516" height="816" rx="6" fill="none" stroke="${frameColor}" stroke-width="1" stroke-opacity="${frameOpacity * 0.4}" stroke-dasharray="8 5"/>
        <circle cx="42" cy="42" r="3" fill="${frameColor}" fill-opacity="${frameOpacity}"/>
        <circle cx="558" cy="42" r="3" fill="${frameColor}" fill-opacity="${frameOpacity}"/>
        <circle cx="42" cy="858" r="3" fill="${frameColor}" fill-opacity="${frameOpacity}"/>
        <circle cx="558" cy="858" r="3" fill="${frameColor}" fill-opacity="${frameOpacity}"/>
      `;
    } else if (frameStyle === 'modern') {
      frameMarkup = `
        <line x1="40" y1="40" x2="560" y2="40" stroke="${frameColor}" stroke-width="3" stroke-opacity="${frameOpacity}"/>
        <line x1="40" y1="860" x2="560" y2="860" stroke="${frameColor}" stroke-width="3" stroke-opacity="${frameOpacity}"/>
        <rect x="50" y="50" width="500" height="800" fill="none" stroke="${frameColor}" stroke-width="1" stroke-opacity="${frameOpacity * 0.3}"/>
      `;
    } else if (frameStyle === 'vintage') {
      frameMarkup = `
        <rect x="25" y="25" width="550" height="850" fill="none" stroke="${frameColor}" stroke-width="3" stroke-opacity="${frameOpacity}"/>
        <rect x="35" y="35" width="530" height="830" fill="none" stroke="${frameColor}" stroke-width="1" stroke-opacity="${frameOpacity * 0.6}"/>
        <line x1="60" y1="70" x2="540" y2="70" stroke="${frameColor}" stroke-width="1" stroke-opacity="${frameOpacity * 0.4}"/>
        <line x1="60" y1="830" x2="540" y2="830" stroke="${frameColor}" stroke-width="1" stroke-opacity="${frameOpacity * 0.4}"/>
      `;
    } else if (frameStyle === 'minimal') {
      frameMarkup = `
        <rect x="40" y="40" width="520" height="820" fill="none" stroke="${frameColor}" stroke-width="1" stroke-opacity="${frameOpacity * 0.4}"/>
      `;
    }

    const rad = (bgGradAngle * Math.PI) / 180;
    const x1 = Math.round(50 + Math.sin(rad) * 50);
    const y1 = Math.round(50 - Math.cos(rad) * 50);
    const x2 = Math.round(50 - Math.sin(rad) * 50);
    const y2 = Math.round(50 + Math.cos(rad) * 50);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="100%" height="100%" style="display: block; width: 100%; height: 100%; border-radius: 8px;">
  <defs>
    <!-- Background Linear Gradient -->
    <linearGradient id="main-bg-grad" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      <stop offset="0%" stop-color="${bgGradColor1}" />
      <stop offset="100%" stop-color="${bgGradColor2}" />
    </linearGradient>

    <!-- Title Gradient -->
    <linearGradient id="title-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${titleGradColor1}" />
      <stop offset="100%" stop-color="${titleGradColor2}" />
    </linearGradient>

    <!-- Radial Glow -->
    <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${bgGlowColor}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="${bgGlowColor}" stop-opacity="0" />
    </radialGradient>

    <!-- Filter for text shadow -->
    <filter id="text-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
  </defs>

  <!-- Base Gradient -->
  <rect width="600" height="900" fill="url(#main-bg-grad)"/>

  <!-- Background Image with Blend Overlay if active -->
  ${
    bgType === 'image' && bgImageBase64
      ? `<image href="${bgImageBase64}" width="600" height="900" preserveAspectRatio="xMidYMid slice" opacity="0.9"/>
         <rect width="600" height="900" fill="url(#main-bg-grad)" opacity="${bgOverlayOpacity}" style="mix-blend-mode: multiply;"/>`
      : ''
  }

  <!-- Radial Glow -->
  ${bgRadialGlow ? `<circle cx="300" cy="${emblemPosY}" r="260" fill="url(#center-glow)"/>` : ''}

  <!-- Decorative Frame -->
  ${frameMarkup}

  <!-- Author Name -->
  <text
    x="300"
    y="${authorPosY}"
    font-family="'Outfit', -apple-system, sans-serif"
    font-size="${authorFontSize}"
    fill="${authorColor}"
    font-weight="600"
    letter-spacing="${authorLetterSpacing}"
    text-anchor="middle"
    ${titleShadow ? 'filter="url(#text-glow)"' : ''}
  >
    ${escapeXml(authorUppercase ? authorText.toUpperCase() : authorText)}
  </text>
  <line x1="210" y1="${authorPosY + 22}" x2="390" y2="${authorPosY + 22}" stroke="${authorColor}" stroke-width="1.5" stroke-opacity="0.75"/>

  <!-- Main Title -->
  <text
    x="300"
    y="${titlePosY}"
    font-family="${titleFont}"
    font-size="${titleFontSize}"
    fill="${titleColorType === 'gradient' ? 'url(#title-grad)' : titleSolidColor}"
    font-weight="bold"
    letter-spacing="${titleLetterSpacing}"
    text-anchor="middle"
    ${titleShadow ? 'filter="url(#text-glow)"' : ''}
  >
    ${titleLines.map((line, idx) => `<tspan x="300" dy="${idx === 0 ? 0 : '1.25em'}">${escapeXml(line)}</tspan>`).join('')}
  </text>

  <!-- Subtitle -->
  ${
    subtitleText
      ? `<text
          x="300"
          y="${subtitlePosY}"
          font-family="'Inter', sans-serif"
          font-size="${subtitleFontSize}"
          fill="${subtitleColor}"
          font-style="italic"
          text-anchor="middle"
          ${titleShadow ? 'filter="url(#text-glow)"' : ''}
        >
          ${escapeXml(subtitleText)}
        </text>`
      : ''
  }

  <!-- Central Emblem Icon -->
  ${
    selectedIcon !== 'none'
      ? `<g transform="translate(${300 - 12 * emblemScale}, ${emblemPosY - 12 * emblemScale}) scale(${emblemScale})">
          ${getEmblemSvgPath(selectedIcon, emblemColor)}
        </g>`
      : ''
  }

  <!-- Bottom Tagline & Accent -->
  <line x1="170" y1="${taglinePosY - 25}" x2="280" y2="${taglinePosY - 25}" stroke="${taglineColor}" stroke-width="1" stroke-opacity="0.5"/>
  <circle cx="300" cy="${taglinePosY - 25}" r="3.5" fill="${taglineColor}"/>
  <line x1="320" y1="${taglinePosY - 25}" x2="430" y2="${taglinePosY - 25}" stroke="${taglineColor}" stroke-width="1" stroke-opacity="0.5"/>

  <text
    x="300"
    y="${taglinePosY}"
    font-family="'Outfit', -apple-system, sans-serif"
    font-size="${taglineFontSize}"
    fill="${taglineColor}"
    font-weight="600"
    letter-spacing="3"
    text-anchor="middle"
    ${titleShadow ? 'filter="url(#text-glow)"' : ''}
  >
    ${escapeXml(taglineText)}
  </text>
</svg>`;
  }, [
    bgType,
    bgGradColor1,
    bgGradColor2,
    bgGradAngle,
    bgImageBase64,
    bgOverlayOpacity,
    bgRadialGlow,
    bgGlowColor,
    frameStyle,
    frameColor,
    frameOpacity,
    titleText,
    titleFontFamily,
    titleFontSize,
    titlePosY,
    titleColorType,
    titleSolidColor,
    titleGradColor1,
    titleGradColor2,
    titleLetterSpacing,
    titleShadow,
    authorText,
    authorFontSize,
    authorPosY,
    authorColor,
    authorLetterSpacing,
    authorUppercase,
    subtitleText,
    subtitleFontSize,
    subtitlePosY,
    subtitleColor,
    taglineText,
    taglineFontSize,
    taglinePosY,
    taglineColor,
    selectedIcon,
    emblemPosY,
    emblemScale,
    emblemColor,
  ]);

  const handleApplyGeneratedCover = async () => {
    await generateCustomCover(generatedSvg);
    showNotification('success', 'Custom cover applied to book metadata and manifest!');
  };

  const handleDownloadHighResPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 2400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([generatedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1600, 2400);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      const cleanTitle = (titleText || 'cover').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanTitle}_cover_1600x2400.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showNotification('success', 'Downloaded 1600×2400 high-res cover PNG!');
    };
    img.src = url;
  };

  const handleDownloadCoverSvg = () => {
    const blob = new Blob([generatedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanTitle = (titleText || 'cover').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${cleanTitle}_cover.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('success', 'Cover downloaded as SVG vector file!');
  };

  if (!book) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No book loaded
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Top Header & Mode Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700 }}>
            Cover Studio
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Manage the EPUB cover artwork or design custom publication graphics
          </p>
        </div>

        {/* Top-Level Mode Selector */}
        <div className="view-tabs" style={{ background: 'var(--bg-surface)' }}>
          <button
            className={`view-tab-btn ${mainMode === 'current' ? 'active' : ''}`}
            onClick={() => setMainMode('current')}
          >
            <ImageIcon size={14} />
            <span>Current Artwork & Direct Upload</span>
          </button>
          <button
            className={`view-tab-btn ${mainMode === 'designer' ? 'active' : ''}`}
            onClick={() => setMainMode('designer')}
          >
            <Sparkles size={14} />
            <span>Cover Designer Studio</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODE 1: CURRENT ARTWORK & DIRECT FILE UPLOAD (UNTOUCHED RAW IMAGE)
         ========================================================================= */}
      {mainMode === 'current' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '2.5rem', alignItems: 'start' }}>
          {/* Left: Current Cover Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '320px',
                aspectRatio: '2 / 3',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(99, 102, 241, 0.25)',
                border: '2px solid var(--border-medium)',
                background: '#09090b',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {book.coverImageUrl ? (
                <img
                  src={book.coverImageUrl}
                  alt="Current EPUB Cover"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#09090b' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                  <ImageIcon size={48} style={{ opacity: 0.35, marginBottom: '0.6rem' }} />
                  <p style={{ fontSize: '0.85rem' }}>No cover image assigned</p>
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              {book.coverImageUrl ? 'Active Book Cover Image' : 'No Cover File in EPUB'}
            </div>
          </div>

          {/* Right: Direct Upload Dropzone & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Direct Upload Dropzone */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDirectDrop}
              onClick={() => directFileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                padding: '3rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--bg-surface)',
                transition: 'var(--transition-fast)',
              }}
            >
              <input
                type="file"
                ref={directFileInputRef}
                style={{ display: 'none' }}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleDirectFileUpload}
              />
              <Upload size={38} color="var(--accent-primary)" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Upload & Replace Cover Photo Directly
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1rem' }}>
                Drag and drop your cover image (JPG, PNG, WebP or SVG) to set it as the book's cover without adding any extra designs or frames.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={e => {
                  e.stopPropagation();
                  directFileInputRef.current?.click();
                }}
              >
                <Upload size={14} />
                <span>Browse Image File</span>
              </button>
            </div>

            {/* Quick Actions & Designer Bridge */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Current Artwork Actions
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleDownloadCurrentCover}
                    disabled={!book.coverImageUrl}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <Download size={14} />
                    <span>Download Cover Image</span>
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleLoadCoverIntoDesigner}
                    disabled={!book.coverImageUrl}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    <Sparkles size={14} />
                    <span>Open in Cover Designer</span>
                  </button>
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Info size={15} />
                  <span>Cover Metadata</span>
                </div>
                <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', margin: 0, lineHeight: 1.6 }}>
                  <li>Manifest ID: <code>{book.coverManifestId || 'None'}</code></li>
                  <li>Media Type: <code>{book.coverMediaType || 'image/jpeg'}</code></li>
                  <li>Auto-linked to EPUB 2 & EPUB 3 cover guides.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            MODE 2: COVER DESIGNER STUDIO (GENERATIVE VECTOR & OVERLAY DESIGNER)
           ========================================================================= */
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', alignItems: 'start' }}>
            {/* Left: Responsive Live Canvas */}
            <div style={{ position: 'sticky', top: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  aspectRatio: '2 / 3',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(99, 102, 241, 0.25)',
                  border: '2px solid var(--border-medium)',
                  background: '#09090b',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  dangerouslySetInnerHTML={{ __html: generatedSvg }}
                />
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                2:3 Standard Book Geometry (Scales to 1600 × 2400 px)
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '320px' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleApplyGeneratedCover}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                    padding: '0.65rem',
                  }}
                >
                  <Check size={16} />
                  <span>Apply Cover to Book</span>
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, fontSize: '0.78rem' }}
                    onClick={handleDownloadHighResPng}
                    title="Download High-Res 1600×2400 PNG"
                  >
                    <Download size={13} />
                    <span>PNG (1600×2400)</span>
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, fontSize: '0.78rem' }}
                    onClick={handleDownloadCoverSvg}
                    title="Download SVG vector"
                  >
                    <Download size={13} />
                    <span>Save SVG</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Studio Control Hub */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              {/* Sub-Tabs */}
              <div className="view-tabs" style={{ width: '100%', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <button
                  className={`view-tab-btn ${designerSubTab === 'text' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setDesignerSubTab('text')}
                >
                  <Type size={14} />
                  <span>Typography</span>
                </button>
                <button
                  className={`view-tab-btn ${designerSubTab === 'bg' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setDesignerSubTab('bg')}
                >
                  <Palette size={14} />
                  <span>Background & Overlay</span>
                </button>
                <button
                  className={`view-tab-btn ${designerSubTab === 'emblem' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setDesignerSubTab('emblem')}
                >
                  <Compass size={14} />
                  <span>Emblems</span>
                </button>
                <button
                  className={`view-tab-btn ${designerSubTab === 'frame' ? 'active' : ''}`}
                  style={{ flex: 1 }}
                  onClick={() => setDesignerSubTab('frame')}
                >
                  <Layout size={14} />
                  <span>Frames</span>
                </button>
              </div>

              {/* TAB 1: TYPOGRAPHY & POSITIONING */}
              {designerSubTab === 'text' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Main Title Controls */}
                  <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Main Title</span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className={`btn btn-sm ${titleColorType === 'gradient' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                          onClick={() => setTitleColorType('gradient')}
                        >
                          Gradient
                        </button>
                        <button
                          className={`btn btn-sm ${titleColorType === 'solid' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                          onClick={() => setTitleColorType('solid')}
                        >
                          Solid
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      className="form-input"
                      style={{ marginBottom: '0.75rem' }}
                      value={titleText}
                      onChange={e => setTitleText(e.target.value)}
                      placeholder="Enter book title"
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Font Family</label>
                        <select
                          className="form-select"
                          value={titleFontFamily}
                          onChange={e => setTitleFontFamily(e.target.value as any)}
                        >
                          <option value="cinzel">Cinzel (Classic Roman)</option>
                          <option value="serif">Georgia (Literary Serif)</option>
                          <option value="playfair">Playfair Display (Luxury)</option>
                          <option value="sans">Outfit (Modern Bold)</option>
                          <option value="mono">Fira Mono (Tech / Thriller)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>
                          {titleColorType === 'gradient' ? 'Gradient Colors' : 'Solid Color'}
                        </label>
                        {titleColorType === 'gradient' ? (
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <input
                              type="color"
                              value={titleGradColor1}
                              onChange={e => setTitleGradColor1(e.target.value)}
                              style={{ height: '36px', width: '50%', cursor: 'pointer', background: 'transparent', border: 'none' }}
                            />
                            <input
                              type="color"
                              value={titleGradColor2}
                              onChange={e => setTitleGradColor2(e.target.value)}
                              style={{ height: '36px', width: '50%', cursor: 'pointer', background: 'transparent', border: 'none' }}
                            />
                          </div>
                        ) : (
                          <input
                            type="color"
                            value={titleSolidColor}
                            onChange={e => setTitleSolidColor(e.target.value)}
                            style={{ height: '36px', width: '100%', cursor: 'pointer', background: 'transparent', border: 'none' }}
                          />
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>Size</span>
                          <span>{titleFontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="24"
                          max="60"
                          value={titleFontSize}
                          onChange={e => setTitleFontSize(parseInt(e.target.value, 10))}
                          style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>Position Y</span>
                          <span>{titlePosY}px</span>
                        </div>
                        <input
                          type="range"
                          min="180"
                          max="500"
                          value={titlePosY}
                          onChange={e => setTitlePosY(parseInt(e.target.value, 10))}
                          style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Letter Spacing:</span>
                        <input
                          type="range"
                          min="0"
                          max="8"
                          value={titleLetterSpacing}
                          onChange={e => setTitleLetterSpacing(parseInt(e.target.value, 10))}
                          style={{ width: '80px', accentColor: 'var(--accent-primary)' }}
                        />
                        <span style={{ fontSize: '0.75rem' }}>{titleLetterSpacing}px</span>
                      </div>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={titleShadow}
                          onChange={e => setTitleShadow(e.target.checked)}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        <span>Text Shadow / Glow</span>
                      </label>
                    </div>
                  </div>

                  {/* Author Controls */}
                  <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Author Byline
                      </span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={authorUppercase}
                          onChange={e => setAuthorUppercase(e.target.checked)}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        <span>ALL CAPS</span>
                      </label>
                    </div>

                    <input
                      type="text"
                      className="form-input"
                      style={{ marginBottom: '0.75rem' }}
                      value={authorText}
                      onChange={e => setAuthorText(e.target.value)}
                      placeholder="Author Name"
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Color</label>
                        <input
                          type="color"
                          value={authorColor}
                          onChange={e => setAuthorColor(e.target.value)}
                          style={{ height: '34px', width: '100%', cursor: 'pointer', background: 'transparent', border: 'none' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <span>Size</span>
                          <span>{authorFontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="12"
                          max="28"
                          value={authorFontSize}
                          onChange={e => setAuthorFontSize(parseInt(e.target.value, 10))}
                          style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <span>Pos Y</span>
                          <span>{authorPosY}px</span>
                        </div>
                        <input
                          type="range"
                          min="80"
                          max="300"
                          value={authorPosY}
                          onChange={e => setAuthorPosY(parseInt(e.target.value, 10))}
                          style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Letter Spacing:</span>
                      <input
                        type="range"
                        min="0"
                        max="8"
                        value={authorLetterSpacing}
                        onChange={e => setAuthorLetterSpacing(parseInt(e.target.value, 10))}
                        style={{ width: '100px', accentColor: 'var(--accent-primary)' }}
                      />
                      <span style={{ fontSize: '0.75rem' }}>{authorLetterSpacing}px</span>
                    </div>
                  </div>

                  {/* Subtitle & Tagline Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Subtitle</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{subtitleFontSize}px</span>
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        style={{ marginBottom: '0.4rem', fontSize: '0.8rem' }}
                        value={subtitleText}
                        onChange={e => setSubtitleText(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <input
                          type="color"
                          value={subtitleColor}
                          onChange={e => setSubtitleColor(e.target.value)}
                          style={{ height: '28px', width: '36px', cursor: 'pointer', background: 'transparent', border: 'none' }}
                        />
                        <input
                          type="range"
                          min="250"
                          max="600"
                          value={subtitlePosY}
                          onChange={e => setSubtitlePosY(parseInt(e.target.value, 10))}
                          style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                        />
                      </div>
                      <input
                        type="range"
                        min="11"
                        max="22"
                        value={subtitleFontSize}
                        onChange={e => setSubtitleFontSize(parseInt(e.target.value, 10))}
                        style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                      />
                    </div>

                    <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Bottom Tagline</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{taglineFontSize}px</span>
                      </div>
                      <input
                        type="text"
                        className="form-input"
                        style={{ marginBottom: '0.4rem', fontSize: '0.8rem' }}
                        value={taglineText}
                        onChange={e => setTaglineText(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <input
                          type="color"
                          value={taglineColor}
                          onChange={e => setTaglineColor(e.target.value)}
                          style={{ height: '28px', width: '36px', cursor: 'pointer', background: 'transparent', border: 'none' }}
                        />
                        <input
                          type="range"
                          min="650"
                          max="850"
                          value={taglinePosY}
                          onChange={e => setTaglinePosY(parseInt(e.target.value, 10))}
                          style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                        />
                      </div>
                      <input
                        type="range"
                        min="9"
                        max="18"
                        value={taglineFontSize}
                        onChange={e => setTaglineFontSize(parseInt(e.target.value, 10))}
                        style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BACKGROUND & IMAGE OVERLAY */}
              {designerSubTab === 'bg' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Background Preset Palette */}
                  <div className="form-group">
                    <label className="form-label">Gradient Presets:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                      {GRADIENT_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setBgGradColor1(preset.c1);
                            setBgGradColor2(preset.c2);
                            setBgGlowColor(preset.c3 || preset.c2);
                            setBgGradAngle(preset.angle);
                          }}
                          style={{
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-md)',
                            background: `linear-gradient(${preset.angle}deg, ${preset.c1}, ${preset.c2})`,
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'center',
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                          }}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Gradient Controls */}
                  <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.6rem' }}>
                      Custom Gradient Colors & Lighting
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Color 1 (Start)</label>
                        <input
                          type="color"
                          value={bgGradColor1}
                          onChange={e => setBgGradColor1(e.target.value)}
                          style={{ height: '36px', width: '100%', cursor: 'pointer', background: 'transparent', border: 'none' }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Color 2 (End)</label>
                        <input
                          type="color"
                          value={bgGradColor2}
                          onChange={e => setBgGradColor2(e.target.value)}
                          style={{ height: '36px', width: '100%', cursor: 'pointer', background: 'transparent', border: 'none' }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.72rem' }}>Center Glow</label>
                        <input
                          type="color"
                          value={bgGlowColor}
                          onChange={e => setBgGlowColor(e.target.value)}
                          style={{ height: '36px', width: '100%', cursor: 'pointer', background: 'transparent', border: 'none' }}
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>Gradient Angle</span>
                        <span>{bgGradAngle}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="15"
                        value={bgGradAngle}
                        onChange={e => setBgGradAngle(parseInt(e.target.value, 10))}
                        style={{ width: '100%', accentColor: 'var(--accent-primary)', marginBottom: '0.6rem' }}
                      />

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={bgRadialGlow}
                          onChange={e => setBgRadialGlow(e.target.checked)}
                          style={{ accentColor: 'var(--accent-primary)' }}
                        />
                        <span>Center Atmosphere Radial Lighting Glow</span>
                      </label>
                    </div>
                  </div>

                  {/* Background Image Upload & Transparency Overlay */}
                  <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Background Image & Overlay</span>
                      {bgImageBase64 && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', color: '#f87171' }}
                          onClick={() => {
                            setBgImageBase64(null);
                            setBgType('gradient');
                          }}
                        >
                          <Trash2 size={12} />
                          <span>Remove Image</span>
                        </button>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={bgImageInputRef}
                      style={{ display: 'none' }}
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleBgImageUpload}
                    />

                    {!bgImageBase64 ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', padding: '0.6rem' }}
                        onClick={() => bgImageInputRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>Upload Background Image (Photo / Art)</span>
                      </button>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                          <span>Gradient Overlay Opacity (Blend Tint)</span>
                          <span>{Math.round(bgOverlayOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={bgOverlayOpacity}
                          onChange={e => setBgOverlayOpacity(parseFloat(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: EMBLEMS */}
              {designerSubTab === 'emblem' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Choose Emblem Icon:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                      {[
                        { id: 'compass', label: 'Compass', icon: <Compass size={16} /> },
                        { id: 'book', label: 'Book', icon: <Book size={16} /> },
                        { id: 'bookopen', label: 'Open Book', icon: <BookOpen size={16} /> },
                        { id: 'quill', label: 'Quill', icon: <Feather size={16} /> },
                        { id: 'moon', label: 'Moon', icon: <Moon size={16} /> },
                        { id: 'shield', label: 'Shield', icon: <Shield size={16} /> },
                        { id: 'crown', label: 'Crown', icon: <Crown size={16} /> },
                        { id: 'star', label: 'Star', icon: <Star size={16} /> },
                        { id: 'flame', label: 'Flame', icon: <Flame size={16} /> },
                        { id: 'key', label: 'Key', icon: <Key size={16} /> },
                        { id: 'hourglass', label: 'Hourglass', icon: <Hourglass size={16} /> },
                        { id: 'trees', label: 'Forest', icon: <Trees size={16} /> },
                        { id: 'mountain', label: 'Mountain', icon: <Mountain size={16} /> },
                        { id: 'eye', label: 'Eye', icon: <Eye size={16} /> },
                        { id: 'none', label: 'None (Text Only)', icon: <Layout size={16} /> },
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          className={`btn btn-sm ${selectedIcon === item.id ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flexDirection: 'column', padding: '0.4rem 0.2rem', gap: '0.2rem', fontSize: '0.68rem' }}
                          onClick={() => setSelectedIcon(item.id)}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedIcon !== 'none' && (
                    <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          Emblem Styling & Geometry
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={emblemGlow}
                            onChange={e => setEmblemGlow(e.target.checked)}
                            style={{ accentColor: 'var(--accent-primary)' }}
                          />
                          <span>Emblem Glow</span>
                        </label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Emblem Color</label>
                          <input
                            type="color"
                            value={emblemColor}
                            onChange={e => setEmblemColor(e.target.value)}
                            style={{ height: '34px', width: '100%', cursor: 'pointer', background: 'transparent', border: 'none' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <span>Scale</span>
                            <span>{emblemScale.toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            min="1.5"
                            max="5.5"
                            step="0.2"
                            value={emblemScale}
                            onChange={e => setEmblemScale(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <span>Position Y</span>
                            <span>{emblemPosY}px</span>
                          </div>
                          <input
                            type="range"
                            min="380"
                            max="680"
                            value={emblemPosY}
                            onChange={e => setEmblemPosY(parseInt(e.target.value, 10))}
                            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: FRAMES */}
              {designerSubTab === 'frame' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Frame & Border Style:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                      {[
                        { id: 'classic', label: 'Classic' },
                        { id: 'modern', label: 'Modern' },
                        { id: 'vintage', label: 'Vintage' },
                        { id: 'minimal', label: 'Minimal' },
                        { id: 'none', label: 'No Border' },
                      ].map(style => (
                        <button
                          key={style.id}
                          type="button"
                          className={`btn btn-sm ${frameStyle === style.id ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem' }}
                          onClick={() => setFrameStyle(style.id as any)}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {frameStyle !== 'none' && (
                    <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.6rem' }}>
                        Frame Color & Opacity
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'center' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.72rem' }}>Color</label>
                          <input
                            type="color"
                            value={frameColor}
                            onChange={e => setFrameColor(e.target.value)}
                            style={{ height: '36px', width: '100%', cursor: 'pointer', background: 'transparent', border: 'none' }}
                          />
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>Border Opacity</span>
                            <span>{Math.round(frameOpacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={frameOpacity}
                            onChange={e => setFrameOpacity(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
