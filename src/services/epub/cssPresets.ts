export interface StylePreset {
  id: string;
  name: string;
  description: string;
  fontFamily: string;
  category: 'Classic' | 'Modern' | 'Academic' | 'Vintage' | 'Minimalist';
  css: string;
}

/**
 * Scopes book stylesheet CSS rules so they apply cleanly inside a target container without leaking
 */
export function scopeCssForContainer(css: string, containerSelector: string): string {
  if (!css) return '';
  // Remove comments
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '').trim();

  return clean.replace(/([^{}]+)\{([^}]+)\}/g, (_match, selectorList, declarations) => {
    const trimmedSelectorList = selectorList.trim();
    if (!trimmedSelectorList) return '';

    // Ignore at-rules like @font-face, @page, @media
    if (trimmedSelectorList.startsWith('@')) {
      return `${trimmedSelectorList} {${declarations}}`;
    }

    const scopedSelectors = trimmedSelectorList
      .split(',')
      .map((sel: string) => {
        const trimmed = sel.trim();
        if (!trimmed) return '';
        if (trimmed === 'body' || trimmed === 'html') {
          return containerSelector;
        }
        if (trimmed.startsWith('body ') || trimmed.startsWith('html ')) {
          return `${containerSelector} ${trimmed.substring(5)}`;
        }
        return `${containerSelector} ${trimmed}`;
      })
      .filter(Boolean)
      .join(', ');

    let sanitizedDeclarations = declarations;
    const isBodyOrHtml = trimmedSelectorList.split(',').some((s: string) => s.trim() === 'body' || s.trim() === 'html');
    if (isBodyOrHtml) {
      // Strip rigid height and overflow properties from body rules that would truncate editor pages
      sanitizedDeclarations = sanitizedDeclarations
        .replace(/\b(height|min-height|max-height)\s*:[^;]+;?/gi, '')
        .replace(/\boverflow(-[xy])?\s*:[^;]+;?/gi, '')
        .replace(/\bposition\s*:\s*(fixed|absolute)\s*;?/gi, '');
    }

    return `${scopedSelectors} {${sanitizedDeclarations}}\n`;
  });
}

export const CSS_PRESETS: StylePreset[] = [
  {
    id: 'classic-literature',
    name: 'Classic Literature',
    description: 'Traditional book typography with indented paragraphs, serif fonts, and elegant headers.',
    fontFamily: "'Merriweather', 'Georgia', serif",
    category: 'Classic',
    css: `/* Classic Literature Book Style */
body {
  font-family: 'Merriweather', 'Georgia', 'Times New Roman', serif;
  line-height: 1.75;
  color: #1a1a1a;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  max-width: 44rem;
  text-align: justify;
}

h1, h2, h3, h4 {
  font-family: 'Outfit', 'Georgia', serif;
  color: inherit;
  text-align: center;
  margin-top: 2.2rem;
  margin-bottom: 1rem;
  font-weight: 700;
}

h1 {
  font-size: 2.2rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 2px solid rgba(128, 128, 128, 0.2);
  padding-bottom: 0.8rem;
}

h2 {
  font-size: 1.4rem;
  font-style: italic;
  color: inherit;
  opacity: 0.9;
}

p {
  margin: 0;
  text-indent: 1.5em;
}

/* First paragraph after heading has no indent */
h1 + p, h2 + p, h3 + p, hr + p, .no-indent {
  text-indent: 0;
}

p.dropcap:first-letter, .dropcap::first-letter {
  float: left;
  font-size: 3.2rem;
  line-height: 0.8;
  padding-top: 4px;
  padding-right: 8px;
  padding-bottom: 2px;
  font-family: 'Georgia', serif;
  font-weight: bold;
  color: #8b5cf6;
}

blockquote {
  margin: 1.8rem 2rem;
  padding-left: 1.2rem;
  border-left: 3px solid #8b5cf6;
  font-style: italic;
  color: #71717a;
}

hr {
  border: 0;
  height: 1px;
  background: #cbd5e1;
  margin: 2.5rem auto;
  width: 40%;
  text-align: center;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 2rem auto;
  border-radius: 4px;
}
`,
  },
  {
    id: 'modern-fiction',
    name: 'Modern Fiction',
    description: 'Clean modern layout with bold headers, subtle paragraph spacing, and modern sans typography.',
    fontFamily: "'Inter', -apple-system, sans-serif",
    category: 'Modern',
    css: `/* Modern Fiction Style */
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.8;
  color: #1e293b;
  margin: 0 auto;
  padding: 2.5rem 2rem;
  max-width: 42rem;
}

h1, h2, h3 {
  font-family: 'Outfit', sans-serif;
  color: #0f172a;
  letter-spacing: -0.02em;
}

h1 {
  font-size: 2.4rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
}

h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

p {
  margin: 1.2rem 0;
  text-align: left;
}

blockquote {
  background: #f1f5f9;
  border-left: 4px solid #0ea5e9;
  padding: 1rem 1.4rem;
  border-radius: 0 8px 8px 0;
  margin: 1.8rem 0;
  color: #334155;
}

img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  margin: 2rem 0;
}
`,
  },
  {
    id: 'academic-nonfiction',
    name: 'Academic / Non-Fiction',
    description: 'Structured layout with crisp headings, numbered sections, styled tables, and notes.',
    fontFamily: "'Literata', 'Georgia', serif",
    category: 'Academic',
    css: `/* Academic Non-Fiction Style */
body {
  font-family: 'Literata', 'Georgia', serif;
  line-height: 1.7;
  color: #18181b;
  margin: 0 auto;
  padding: 2.5rem;
  max-width: 46rem;
}

h1, h2, h3 {
  font-family: 'Outfit', sans-serif;
  color: #09090b;
}

h1 {
  font-size: 2rem;
  border-bottom: 1px solid #e4e4e7;
  padding-bottom: 0.6rem;
  margin-bottom: 1.5rem;
}

h2 {
  font-size: 1.35rem;
  margin-top: 2rem;
  color: #27272a;
}

p {
  margin: 1rem 0;
  text-align: justify;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
  font-size: 0.95rem;
}

th, td {
  border: 1px solid #e4e4e7;
  padding: 0.75rem 1rem;
  text-align: left;
}

th {
  background: #f4f4f5;
  font-weight: 600;
}

blockquote {
  border-left: 3px solid #71717a;
  padding-left: 1.2rem;
  margin: 1.5rem 0;
  color: #52525b;
}
`,
  },
  {
    id: 'vintage-paperback',
    name: 'Vintage Paperback',
    description: 'Nostalgic paperback feel with warm tones, ornamental dividers, and classic typography.',
    fontFamily: "'Georgia', serif",
    category: 'Vintage',
    css: `/* Vintage Paperback Style */
body {
  font-family: 'Georgia', 'Garamond', serif;
  line-height: 1.65;
  color: #2e261f;
  background-color: #faf6ee;
  margin: 0 auto;
  padding: 2.5rem 1.8rem;
  max-width: 40rem;
  text-align: justify;
}

h1 {
  font-size: 2rem;
  text-align: center;
  font-weight: normal;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 2rem;
}

h2 {
  font-size: 1.25rem;
  text-align: center;
  font-weight: normal;
  font-style: italic;
  margin: 1.8rem 0 1rem;
}

p {
  margin: 0;
  text-indent: 1.75em;
}

h1 + p, h2 + p, hr + p {
  text-indent: 0;
}

p.dropcap:first-letter {
  float: left;
  font-size: 3.5rem;
  line-height: 0.75;
  padding: 4px 6px 0 0;
  font-family: 'Georgia', serif;
  color: #8c5b36;
}

hr {
  border: none;
  text-align: center;
  margin: 2rem 0;
}

hr::before {
  content: "❦ ❦ ❦";
  font-size: 1.2rem;
  color: #a67c52;
}
`,
  },
  {
    id: 'minimalist-noir',
    name: 'Minimalist Clean',
    description: 'High readability, optimized spacing, and distraction-free typography.',
    fontFamily: "'Inter', sans-serif",
    category: 'Minimalist',
    css: `/* Minimalist Clean Style */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.75;
  color: #0f172a;
  margin: 0 auto;
  padding: 2.5rem 1.5rem;
  max-width: 42rem;
}

h1, h2, h3 {
  font-weight: 700;
  color: #0f172a;
}

h1 { font-size: 2.2rem; margin-bottom: 1.5rem; }
h2 { font-size: 1.4rem; margin-top: 2rem; margin-bottom: 0.8rem; }
p { margin: 1.1rem 0; }
blockquote { border-left: 2px solid #0f172a; padding-left: 1rem; margin: 1.5rem 0; font-style: italic; }
`,
  },
];
