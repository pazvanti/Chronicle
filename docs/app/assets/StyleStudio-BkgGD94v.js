import{i as e}from"./rolldown-runtime-Dd_uD5pT.js";import{n as t,s as n,t as r}from"./createLucideIcon-Cf3wdTHj.js";import{$t as i,Ct as a,N as o,S as s,Tt as c,_t as l}from"./index-ChEknms3.js";var u=r(`code`,[[`path`,{d:`m16 18 6-6-6-6`,key:`eg8j8`}],[`path`,{d:`m8 6-6 6 6 6`,key:`ppft3o`}]]),d=e(n(),1),f=t(),p=()=>{let{book:e,customCss:t,applyCustomCssToBook:n}=a(),{t:r}=c(),[p,m]=(0,d.useState)(`presets`),[h,g]=(0,d.useState)(`classic-literature`),[_,v]=(0,d.useState)(t||i[0].css),[y,b]=(0,d.useState)(`serif`),[x,S]=(0,d.useState)(`indent`),[C,w]=(0,d.useState)(`justify`),[T,E]=(0,d.useState)(1.75),[D,O]=(0,d.useState)(!0);if((0,d.useEffect)(()=>{t&&v(t)},[t]),!e)return(0,f.jsx)(`div`,{style:{padding:`4rem`,textAlign:`center`,color:`var(--text-muted)`},children:r(`statusBar.noManuscript`)});let k=e=>{g(e.id),v(e.css),n(e.css)},A=()=>{let e=`/* Custom Styled EPUB Stylesheet */
body {
  font-family: ${y===`serif`?`'Merriweather', 'Georgia', serif`:y===`sans`?`'Inter', -apple-system, sans-serif`:y===`book`?`'Literata', 'Georgia', serif`:`'Fira Code', monospace`};
  line-height: ${T};
  color: #1a1a1a;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  max-width: 44rem;
  text-align: ${C};
}

h1, h2, h3 {
  font-family: 'Outfit', sans-serif;
  color: #111827;
}

h1 {
  font-size: 2.2rem;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

h2 {
  font-size: 1.4rem;
  margin-top: 1.8rem;
  margin-bottom: 0.8rem;
}

p {
  margin: ${x===`block`?`1.1rem 0`:`0`};
  ${x===`indent`?`text-indent: 1.5em;`:``}
}

${x===`indent`?`body > p:first-of-type, body > p:first-child, p:first-of-type, h1 + p, h2 + p, h3 + p, h4 + p, hr + p, blockquote + p, .no-indent { text-indent: 0; }`:``}

${D?`p.dropcap:first-letter, .dropcap::first-letter {
  float: left;
  font-size: 3.2rem;
  line-height: 0.8;
  padding: 4px 8px 2px 0;
  font-weight: bold;
  color: #4338ca;
}`:``}

blockquote {
  border-left: 3px solid #6366f1;
  padding-left: 1.2rem;
  margin: 1.5rem 0;
  font-style: italic;
  color: #4b5563;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1.8rem auto;
  border-radius: 4px;
}
`;v(e),n(e)};return(0,f.jsxs)(`div`,{style:{flex:1,overflowY:`auto`,padding:`2rem`,maxWidth:`1000px`,margin:`0 auto`,width:`100%`},children:[(0,f.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,justifyContent:`space-between`,marginBottom:`1.5rem`},children:[(0,f.jsxs)(`div`,{children:[(0,f.jsx)(`h2`,{style:{fontFamily:`var(--font-heading)`,fontSize:`1.5rem`,fontWeight:700},children:r(`styleStudio.title`)}),(0,f.jsx)(`p`,{style:{fontSize:`0.85rem`,color:`var(--text-secondary)`},children:r(`styleStudio.subtitle`)})]}),(0,f.jsxs)(`div`,{style:{display:`flex`,gap:`0.5rem`,alignItems:`center`},children:[(0,f.jsxs)(`div`,{className:`view-tabs`,style:{background:`var(--bg-surface)`},children:[(0,f.jsxs)(`button`,{className:`view-tab-btn ${p===`presets`?`active`:``}`,onClick:()=>m(`presets`),children:[(0,f.jsx)(o,{size:14}),(0,f.jsx)(`span`,{children:r(`styleStudio.tabPresets`)})]}),(0,f.jsxs)(`button`,{className:`view-tab-btn ${p===`customizer`?`active`:``}`,onClick:()=>{m(`customizer`),A()},children:[(0,f.jsx)(s,{size:14}),(0,f.jsx)(`span`,{children:r(`styleStudio.tabCustomizer`)})]}),(0,f.jsxs)(`button`,{className:`view-tab-btn ${p===`css`?`active`:``}`,onClick:()=>m(`css`),children:[(0,f.jsx)(u,{size:14}),(0,f.jsx)(`span`,{children:r(`styleStudio.tabCss`)})]})]}),(0,f.jsxs)(`button`,{className:`btn btn-primary`,onClick:()=>{n(_)},children:[(0,f.jsx)(l,{size:15}),(0,f.jsx)(`span`,{children:r(`styleStudio.applyBtn`)})]})]})]}),(0,f.jsxs)(`div`,{style:{display:`grid`,gridTemplateColumns:`1.1fr 1fr`,gap:`1.5rem`,alignItems:`start`},children:[(0,f.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`1rem`},children:[p===`presets`&&(0,f.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`0.75rem`},children:[(0,f.jsx)(`div`,{style:{fontSize:`0.85rem`,fontWeight:600,color:`var(--text-secondary)`},children:`Choose a Publishing Preset:`}),i.map(e=>{let t=h===e.id;return(0,f.jsxs)(`div`,{onClick:()=>k(e),style:{padding:`1rem 1.25rem`,borderRadius:`var(--radius-md)`,background:t?`rgba(99, 102, 241, 0.12)`:`var(--bg-surface)`,border:`1.5px solid ${t?`var(--accent-primary)`:`var(--border-subtle)`}`,cursor:`pointer`,transition:`var(--transition-fast)`},children:[(0,f.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,justifyContent:`space-between`,marginBottom:`0.3rem`},children:[(0,f.jsx)(`span`,{style:{fontSize:`1rem`,fontWeight:700,color:`var(--text-primary)`},children:e.name}),(0,f.jsx)(`span`,{style:{fontSize:`0.7rem`,fontWeight:600,padding:`0.15rem 0.5rem`,borderRadius:`var(--radius-full)`,background:`rgba(255, 255, 255, 0.08)`,color:`var(--accent-primary)`},children:e.category})]}),(0,f.jsx)(`p`,{style:{fontSize:`0.82rem`,color:`var(--text-secondary)`,margin:0,lineHeight:1.4},children:e.description})]},e.id)})]}),p===`customizer`&&(0,f.jsxs)(`div`,{style:{background:`var(--bg-surface)`,padding:`1.25rem`,borderRadius:`var(--radius-md)`,border:`1px solid var(--border-subtle)`,display:`flex`,flexDirection:`column`,gap:`1.2rem`},children:[(0,f.jsxs)(`div`,{className:`form-group`,children:[(0,f.jsx)(`label`,{className:`form-label`,children:r(`styleStudio.fontFamily`)}),(0,f.jsxs)(`select`,{className:`form-select`,value:y,onChange:e=>{b(e.target.value),setTimeout(A,10)},children:[(0,f.jsx)(`option`,{value:`serif`,children:`Merriweather (Classic Editorial Serif)`}),(0,f.jsx)(`option`,{value:`book`,children:`Literata (Google Books Serif)`}),(0,f.jsx)(`option`,{value:`sans`,children:`Inter (Modern Clean Sans)`}),(0,f.jsx)(`option`,{value:`mono`,children:`Fira Mono (Code / Typewriter)`})]})]}),(0,f.jsxs)(`div`,{className:`form-group`,children:[(0,f.jsx)(`label`,{className:`form-label`,children:r(`styleStudio.paragraphSpacing`)}),(0,f.jsxs)(`div`,{style:{display:`flex`,gap:`0.5rem`},children:[(0,f.jsx)(`button`,{type:`button`,className:`btn btn-sm ${x===`indent`?`btn-primary`:`btn-secondary`}`,style:{flex:1},onClick:()=>{S(`indent`),setTimeout(A,10)},children:r(`styleStudio.indentStyle`)}),(0,f.jsx)(`button`,{type:`button`,className:`btn btn-sm ${x===`block`?`btn-primary`:`btn-secondary`}`,style:{flex:1},onClick:()=>{S(`block`),setTimeout(A,10)},children:r(`styleStudio.blockStyle`)})]})]}),(0,f.jsxs)(`div`,{className:`form-group`,children:[(0,f.jsx)(`label`,{className:`form-label`,children:r(`editor.alignJustify`)}),(0,f.jsxs)(`div`,{style:{display:`flex`,gap:`0.5rem`},children:[(0,f.jsx)(`button`,{type:`button`,className:`btn btn-sm ${C===`justify`?`btn-primary`:`btn-secondary`}`,style:{flex:1},onClick:()=>{w(`justify`),setTimeout(A,10)},children:r(`editor.alignJustify`).split(` (`)[0]}),(0,f.jsx)(`button`,{type:`button`,className:`btn btn-sm ${C===`left`?`btn-primary`:`btn-secondary`}`,style:{flex:1},onClick:()=>{w(`left`),setTimeout(A,10)},children:r(`editor.alignLeft`).split(` (`)[0]})]})]}),(0,f.jsxs)(`div`,{className:`form-group`,children:[(0,f.jsxs)(`label`,{className:`form-label`,style:{display:`flex`,justifyContent:`space-between`},children:[(0,f.jsx)(`span`,{children:r(`styleStudio.lineSpacing`)}),(0,f.jsx)(`span`,{children:T})]}),(0,f.jsx)(`input`,{type:`range`,min:`1.4`,max:`2.2`,step:`0.05`,value:T,onChange:e=>{E(parseFloat(e.target.value)),setTimeout(A,10)},style:{accentColor:`var(--accent-primary)`,width:`100%`}})]}),(0,f.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:`0.6rem`,cursor:`pointer`},children:[(0,f.jsx)(`input`,{type:`checkbox`,checked:D,onChange:e=>{O(e.target.checked),setTimeout(A,10)},style:{accentColor:`var(--accent-primary)`}}),(0,f.jsx)(`span`,{style:{fontSize:`0.88rem`,fontWeight:500},children:r(`styleStudio.dropCaps`)})]})]}),p===`css`&&(0,f.jsx)(`div`,{style:{display:`flex`,flexDirection:`column`,height:`420px`,background:`#090d16`,borderRadius:`var(--radius-md)`,overflow:`hidden`,border:`1px solid var(--border-subtle)`},children:(0,f.jsx)(`textarea`,{value:_,onChange:e=>v(e.target.value),spellCheck:!1,style:{flex:1,background:`transparent`,color:`#93c5fd`,fontFamily:`var(--font-reader-mono)`,fontSize:`0.85rem`,padding:`1rem`,border:`none`,outline:`none`,resize:`none`,lineHeight:1.5}})})]}),(0,f.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`0.6rem`},children:[(0,f.jsx)(`div`,{style:{fontSize:`0.85rem`,fontWeight:600,color:`var(--text-secondary)`},children:`Live Typography Preview`}),(0,f.jsx)(`div`,{style:{background:`#ffffff`,borderRadius:`var(--radius-md)`,boxShadow:`0 4px 20px rgba(0,0,0,0.15)`,border:`1px solid #cbd5e1`,overflow:`hidden`,height:`480px`},children:(0,f.jsx)(`iframe`,{title:`Style Preview`,srcDoc:`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${_}
  </style>
</head>
<body>
  <h1>Chapter One</h1>
  <h2>Into the Great Unknown</h2>
  <p class="dropcap">
    The crisp morning air carried a scent of pine and distant rain. In the quiet hours before dawn,
    the cobblestone streets were devoid of travelers, save for a solitary figure wrapped in a woolen mantle.
  </p>
  <p>
    He consulted the brass timepiece once more, noting the rhythmic swing of the pendulum.
    Every decision made that autumn would echo far beyond the boundaries of the forgotten valley.
  </p>
  <blockquote>
    "Some journeys begin with a single stride; others with a quiet realization."
  </blockquote>
  <p>
    By mid-afternoon, the sun had crested the granite peaks, illuminating the sprawling woodland below.
  </p>
</body>
</html>`,style:{width:`100%`,height:`100%`,border:`none`,background:`transparent`}})})]})]})]})};export{p as StyleStudio};