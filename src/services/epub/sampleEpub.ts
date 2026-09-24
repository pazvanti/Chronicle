import JSZip from 'jszip';
import { parseEpub } from './epubParser';
import { EpubBook } from '../../types/project';

/**
 * Creates a sample EPUB binary ("Alice's Adventures in Wonderland") and parses it into an EpubBook.
 */
export async function createSampleEpubBook(lang: string = 'en'): Promise<EpubBook> {
  const zip = new JSZip();
  const isPt = lang === 'pt-BR' || lang.startsWith('pt');

  // 1. mimetype (Uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. container.xml
  zip.folder('META-INF')?.file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // 3. Cover SVG as PNG/SVG
  const coverTitlePt = `
  <text x="300" y="340" font-family="'Georgia', serif" font-size="44" fill="#ffffff" font-weight="bold" text-anchor="middle">Alice no</text>
  <text x="300" y="400" font-family="'Georgia', serif" font-size="38" fill="#e0e7ff" font-weight="bold" text-anchor="middle">País das</text>
  <text x="300" y="460" font-family="'Georgia', serif" font-size="46" fill="#a5b4fc" font-weight="bold" letter-spacing="1" text-anchor="middle">Maravilhas</text>`;

  const coverTitleEn = `
  <text x="300" y="340" font-family="'Georgia', serif" font-size="44" fill="#ffffff" font-weight="bold" text-anchor="middle">Alice's</text>
  <text x="300" y="400" font-family="'Georgia', serif" font-size="38" fill="#e0e7ff" font-weight="bold" text-anchor="middle">Adventures in</text>
  <text x="300" y="460" font-family="'Georgia', serif" font-size="46" fill="#a5b4fc" font-weight="bold" letter-spacing="1" text-anchor="middle">Wonderland</text>`;

  const coverSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="1600" height="2400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="50%" stop-color="#312e81" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#818cf8" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <circle cx="300" cy="380" r="240" fill="url(#glow)"/>
  
  <rect x="40" y="40" width="520" height="820" rx="16" fill="none" stroke="#6366f1" stroke-width="2" stroke-opacity="0.5" stroke-dasharray="8 6"/>
  <rect x="55" y="55" width="490" height="790" rx="12" fill="none" stroke="#a5b4fc" stroke-width="1" stroke-opacity="0.3"/>

  <!-- Title & Author -->
  <text x="300" y="220" font-family="'Georgia', serif" font-size="20" fill="#c7d2fe" font-weight="600" letter-spacing="4" text-anchor="middle">LEWIS CARROLL</text>
  <line x1="220" y1="245" x2="380" y2="245" stroke="#818cf8" stroke-width="2"/>
  
  ${isPt ? coverTitlePt : coverTitleEn}

  <!-- Illustration Icon / Pocket Watch Motif -->
  <circle cx="300" cy="580" r="50" fill="none" stroke="#fbbf24" stroke-width="4"/>
  <circle cx="300" cy="580" r="42" fill="#1e1b4b" stroke="#fef08a" stroke-width="1"/>
  <line x1="300" y1="580" x2="300" y2="550" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
  <line x1="300" y1="580" x2="325" y2="580" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
  <circle cx="300" cy="580" r="4" fill="#fbbf24"/>
  
  <text x="300" y="720" font-family="sans-serif" font-size="14" fill="#94a3b8" letter-spacing="3" text-anchor="middle">${isPt ? 'EDIÇÃO CHRONICLE STUDIO' : 'EPUB EDITOR EDITION'}</text>
  <text x="300" y="750" font-family="sans-serif" font-size="12" fill="#64748b" text-anchor="middle">${isPt ? 'Coleção de Literatura Clássica' : 'Classic Literature Collection'}</text>
</svg>`;

  zip.folder('OEBPS')?.folder('Images')?.file('cover.svg', coverSvg);

  // 4. Stylesheet
  const css = `
body {
  font-family: 'Merriweather', Georgia, serif;
  line-height: 1.7;
  color: #1a1a1a;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  max-width: 42rem;
}
h1, h2, h3 {
  font-family: 'Outfit', -apple-system, sans-serif;
  color: inherit;
  margin-top: 1.8rem;
  margin-bottom: 0.8rem;
}
h1 {
  font-size: 2rem;
  border-bottom: 2px solid rgba(128, 128, 128, 0.2);
  padding-bottom: 0.5rem;
}
h2 {
  font-size: 1.4rem;
  color: inherit;
  opacity: 0.9;
}
p {
  margin: 1rem 0;
  text-align: justify;
}
blockquote {
  border-left: 4px solid #8b5cf6;
  padding-left: 1.2rem;
  margin: 1.5rem 0;
  color: #71717a;
  font-style: italic;
}
.center {
  text-align: center;
}
`;
  zip.folder('OEBPS')?.folder('Styles')?.file('style.css', css);

  // 5. Chapters
  const ch1Pt = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Capítulo I: Pela Toca do Coelho</title>
  <link rel="stylesheet" type="text/css" href="../Styles/style.css"/>
</head>
<body>
  <h1>CAPÍTULO I</h1>
  <h2>Pela Toca do Coelho</h2>
  
  <p>Alice começava a ficar muito cansada de estar sentada ao lado de sua irmã no barranco, e de não ter nada para fazer: uma ou duas vezes ela havia espiado o livro que a irmã estava lendo, mas não continha figuras ou diálogos, <em>"e de que serve um livro,"</em> pensou Alice, <em>"sem figuras nem diálogos?"</em></p>
  
  <p>Assim, ela meditava em sua mente (tão bem quanto podia, pois o dia quente a deixava sonolenta e apática), se o prazer de fazer uma guirlanda de margaridas valeria o esforço de se levantar para colher as flores, quando de repente um <strong><mark data-comment-id="comment-alice-1" class="author-comment-highlight" style="background-color: #fef08a; border-bottom: 2px solid #eab308; border-radius: 3px; padding: 0.08em 0.25em;">Coelho Branco de olhos cor-de-rosa</mark></strong> passou correndo perto dela.</p>

  <blockquote>
    "Ai, meu Deus! Ai, meu Deus! Vou chegar atrasado!"
  </blockquote>

  <p>Não havia nada de tão <em>muito</em> extraordinário nisso; nem Alice achou tão <em>muito</em> fora do comum ouvir o Coelho dizer para si mesmo: <em>"Ai, meu Deus! Vou chegar atrasado!"</em> (quando pensou nisso mais tarde, percebeu que deveria ter estranhado, mas na hora tudo pareceu perfeitamente natural); porém, quando o Coelho <strong><mark data-comment-id="comment-alice-2" class="author-comment-highlight" style="background-color: #bbf7d0; border-bottom: 2px solid #22c55e; border-radius: 3px; padding: 0.08em 0.25em;">tirou um relógio do bolso do colete</mark></strong>, olhou para ele e apressou o passo, Alice se pôs de pé em um salto, pois percebeu que nunca antes tinha visto um coelho de colete, e muito menos com um relógio para tirar de dentro dele.</p>

  <h2>A Longa Queda</h2>
  <p>Queimando de curiosidade, ela correu pelo campo atrás dele e, felizmente, chegou a tempo de vê-lo mergulhar numa grande toca sob a cerca viva.</p>
  <p>No instante seguinte, Alice desceu atrás dele, sem pensar nem por um segundo em como conseguiria sair dali novamente.</p>
</body>
</html>`;

  const ch1En = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Chapter I: Down the Rabbit-Hole</title>
  <link rel="stylesheet" type="text/css" href="../Styles/style.css"/>
</head>
<body>
  <h1>CHAPTER I</h1>
  <h2>Down the Rabbit-Hole</h2>
  
  <p>Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, <em>"and what is the use of a book,"</em> thought Alice <em>"without pictures or conversations?"</em></p>
  
  <p>So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a <strong><mark data-comment-id="comment-alice-1" class="author-comment-highlight" style="background-color: #fef08a; border-bottom: 2px solid #eab308; border-radius: 3px; padding: 0.08em 0.25em;">White Rabbit with pink eyes</mark></strong> ran close by her.</p>

  <blockquote>
    "Oh dear! Oh dear! I shall be late!"
  </blockquote>

  <p>There was nothing so <em>very</em> remarkable in that; nor did Alice think it so <em>very</em> much out of the way to hear the Rabbit say to itself, <em>"Oh dear! Oh dear! I shall be late!"</em> (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually <strong><mark data-comment-id="comment-alice-2" class="author-comment-highlight" style="background-color: #bbf7d0; border-bottom: 2px solid #22c55e; border-radius: 3px; padding: 0.08em 0.25em;">took a watch out of its waistcoat-pocket</mark></strong>, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.</p>

  <h2>The Long Fall</h2>
  <p>In another moment down went Alice after it, never once considering how in the world she was to get out again.</p>
  <p>The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.</p>
</body>
</html>`;

  const ch2Pt = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Capítulo II: O Mar de Lágrimas</title>
  <link rel="stylesheet" type="text/css" href="../Styles/style.css"/>
</head>
<body>
  <h1>CAPÍTULO II</h1>
  <h2>O Mar de Lágrimas</h2>
  
  <p><em>"Curiosíssimo e mais curioso ainda!"</em> exclamou Alice (estava tão surpresa que, no momento, esqueceu-se de falar a sua língua com perfeição); <em>"agora estou me esticando como o maior telescópio do mundo! Adeus, pés!"</em> (pois quando olhou para os próprios pés, eles pareciam quase fora de vista, de tão distantes).</p>

  <p><em>"Oh, meus pobres pezinhos, quem calçará seus sapatos e meias agora, queridos? Tenho certeza de que eu não poderei! Estarei longe demais para me preocupar com vocês..."</em></p>

  <h2>Chorando um Oceano</h2>
  <p>E continuou a planejar como faria: <em>"Terei de mandar presentes para os meus próprios pés pelo correio! Que coisa mais cômica!"</em></p>
  <p>Nesse instante, sua cabeça bateu contra o teto do salão: ela havia alcançado quase três metros de altura. Prontamente pegou a pequena chave dourada e correu em direção à porta do jardim.</p>
</body>
</html>`;

  const ch2En = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Chapter II: The Pool of Tears</title>
  <link rel="stylesheet" type="text/css" href="../Styles/style.css"/>
</head>
<body>
  <h1>CHAPTER II</h1>
  <h2>The Pool of Tears</h2>
  
  <p><em>"Curiouser and curiouser!"</em> cried Alice (she was so much surprised, that for the moment she quite forgot how to speak good English); <em>"now I'm opening out like the largest telescope that ever was! Good-bye, feet!"</em> (for when she looked down at her feet, they seemed to be almost out of sight, they were getting so far off).</p>

  <p><em>"Oh, my poor little feet, I wonder who will put on your shoes and stockings for you now, dears? I'm sure I shan't be able! I shall be a great deal too far off to trouble myself about you: you must manage the best way you can; — but I must be kind to them,"</em> thought Alice, <em>"or perhaps they won't walk the way I want to go! Let me see: I'll give them a new pair of boots every Christmas."</em></p>

  <h2>Crying an Ocean</h2>
  <p>And she went on planning to herself how she would manage it. <em>"They must go by the carrier,"</em> she thought; <em>"and how funny it'll seem, sending presents to one's own feet! And how odd the directions will look!"</em></p>
  <p>Just then her head struck against the roof of the hall: in fact she was now more than nine feet high, and she at once took up the little golden key and hurried off to the garden door.</p>
</body>
</html>`;

  const ch3Pt = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Capítulo III: Uma Corrida Eleitoral e uma Longa História</title>
  <link rel="stylesheet" type="text/css" href="../Styles/style.css"/>
</head>
<body>
  <h1>CAPÍTULO III</h1>
  <h2>Uma Corrida Eleitoral e uma Longa História</h2>
  
  <p>Era, de fato, uma assembleia de aspecto curioso reunida na margem — pássaros de penas desgrenhadas, animais com pelos empapados, todos encharcados, irritados e desconfortáveis.</p>

  <p>A primeira questão, evidentemente, era como se secar novamente: realizaram uma consulta e, após alguns minutos, pareceu bem natural para Alice conversar familiarmente com todos eles.</p>

  <h2>A Proposta do Dodô</h2>
  <p><em>"O que eu ia dizer,"</em> pronunciou o Dodô com tom solene, <em>"é que a melhor maneira de nos secarmos seria uma Corrida Maluca."</em></p>
  <p><em>"E o que é uma Corrida Maluca?"</em> perguntou Alice.</p>
  <p><em>"Bem,"</em> respondeu o Dodô, <em>"a melhor forma de explicar é fazendo."</em></p>
</body>
</html>`;

  const ch3En = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Chapter III: A Caucus-Race and a Long Tale</title>
  <link rel="stylesheet" type="text/css" href="../Styles/style.css"/>
</head>
<body>
  <h1>CHAPTER III</h1>
  <h2>A Caucus-Race and a Long Tale</h2>
  
  <p>They were indeed a queer-looking party that assembled on the bank — the birds with draggled feathers, the animals with their fur clinging close to them, and all dripping wet, cross, and uncomfortable.</p>

  <p>The first question of course was, how to get dry again: they had a consultation about this, and after a few minutes it seemed quite natural to Alice to find herself talking familiarly with them, as if she had known them all her life.</p>

  <h2>The Dodo's Proposal</h2>
  <p><em>"What I was going to say,"</em> said the Dodo in an offended tone, <em>"was, that the best thing to get us dry would be a Caucus-race."</em></p>
  <p><em>"What is a Caucus-race?"</em> said Alice; not that she wanted much to know, but the Dodo had paused as if it thought that somebody ought to speak, and no one else seemed inclined to say anything.</p>
  <p><em>"Why,"</em> said the Dodo, <em>"the best way to explain it is to do it."</em></p>
</body>
</html>`;

  zip.folder('OEBPS')?.folder('Text')?.file('chapter1.xhtml', isPt ? ch1Pt : ch1En);
  zip.folder('OEBPS')?.folder('Text')?.file('chapter2.xhtml', isPt ? ch2Pt : ch2En);
  zip.folder('OEBPS')?.folder('Text')?.file('chapter3.xhtml', isPt ? ch3Pt : ch3En);

  const title1 = isPt ? 'Capítulo I: Pela Toca do Coelho' : 'Chapter I: Down the Rabbit-Hole';
  const title2 = isPt ? 'Capítulo II: O Mar de Lágrimas' : 'Chapter II: The Pool of Tears';
  const title3 = isPt ? 'Capítulo III: Uma Corrida Eleitoral e uma Longa História' : 'Chapter III: A Caucus-Race and a Long Tale';
  const bookTitle = isPt ? 'Alice no País das Maravilhas' : "Alice's Adventures in Wonderland";
  const bookDesc = isPt
    ? 'O clássico conto de Alice caindo pela toca do coelho em direção a um mundo fantástico povoado por criaturas peculiares e antropomórficas.'
    : 'The classic tale of Alice falling through a rabbit hole into a fantasy world populated by peculiar, anthropomorphic creatures.';

  // 6. Nav (EPUB 3)
  const nav = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${isPt ? 'pt-BR' : 'en'}">
<head>
  <meta charset="utf-8"/>
  <title>${isPt ? 'Sumário' : 'Table of Contents'}</title>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${isPt ? 'Sumário' : 'Table of Contents'}</h1>
    <ol>
      <li><a href="Text/chapter1.xhtml">${title1}</a></li>
      <li><a href="Text/chapter2.xhtml">${title2}</a></li>
      <li><a href="Text/chapter3.xhtml">${title3}</a></li>
    </ol>
  </nav>
</body>
</html>`;
  zip.folder('OEBPS')?.file('nav.xhtml', nav);

  // 7. NCX (EPUB 2)
  const ncx = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:alice-in-wonderland-demo"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${bookTitle}</text>
  </docTitle>
  <navMap>
    <navPoint id="np-1" playOrder="1">
      <navLabel><text>${title1}</text></navLabel>
      <content src="Text/chapter1.xhtml"/>
    </navPoint>
    <navPoint id="np-2" playOrder="2">
      <navLabel><text>${title2}</text></navLabel>
      <content src="Text/chapter2.xhtml"/>
    </navPoint>
    <navPoint id="np-3" playOrder="3">
      <navLabel><text>${title3}</text></navLabel>
      <content src="Text/chapter3.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
  zip.folder('OEBPS')?.file('toc.ncx', ncx);

  // 8. OPF
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package version="3.0" unique-identifier="BookId" xmlns="http://www.idpf.org/2007/opf" xml:lang="${isPt ? 'pt-BR' : 'en'}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId">urn:uuid:alice-in-wonderland-demo</dc:identifier>
    <dc:title>${bookTitle}</dc:title>
    <dc:creator id="creator">Lewis Carroll</dc:creator>
    <dc:language>${isPt ? 'pt-BR' : 'en'}</dc:language>
    <dc:publisher>Chronicle</dc:publisher>
    <dc:date>1865-11-26</dc:date>
    <dc:rights>Public Domain</dc:rights>
    <dc:description>${bookDesc}</dc:description>
    <dc:subject>${isPt ? 'Clássicos' : 'Classics'}</dc:subject>
    <dc:subject>${isPt ? 'Fantasia' : 'Fantasy'}</dc:subject>
    <dc:subject>${isPt ? 'Literatura Infantojuvenil' : "Children's Literature"}</dc:subject>
    <meta property="dcterms:modified">2026-09-02T10:00:00Z</meta>
    <meta name="cover" content="cover-image"/>
  </metadata>
  <manifest>
    <item id="cover-image" href="Images/cover.svg" media-type="image/svg+xml" properties="cover-image"/>
    <item id="style" href="Styles/style.css" media-type="text/css"/>
    <item id="chapter1" href="Text/chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="Text/chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter3" href="Text/chapter3.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
    <itemref idref="chapter3"/>
  </spine>
  <guide>
    <reference type="cover" title="Cover" href="Images/cover.svg"/>
    <reference type="toc" title="Table of Contents" href="toc.ncx"/>
  </guide>
</package>`;
  zip.folder('OEBPS')?.file('content.opf', opf);

  const epubBlob = await zip.generateAsync({
    type: 'uint8array',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
  });

  const parsedBook = await parseEpub(epubBlob, `${bookTitle}.epub`);
  parsedBook.writerData = {
    comments: isPt
      ? [
          {
            id: 'comment-alice-1',
            chapterId: 'chapter1',
            selectedText: 'Coelho Branco de olhos cor-de-rosa',
            comment: 'Incidente incitante principal! Enfatize o contraste entre o tédio sonolento de Alice e essa criatura fantástica.',
            color: '#fef08a',
            createdAt: '2026-09-08T10:15:00.000Z',
          },
          {
            id: 'comment-alice-2',
            chapterId: 'chapter1',
            selectedText: 'tirou um relógio do bolso do colete',
            comment: 'O relógio é o símbolo central da ansiedade e obsessão vitoriana com horários e compromissos.',
            color: '#bbf7d0',
            createdAt: '2026-09-08T10:20:00.000Z',
          },
        ]
      : [
          {
            id: 'comment-alice-1',
            chapterId: 'chapter1',
            selectedText: 'White Rabbit with pink eyes',
            comment: 'Key inciting incident! Consider emphasizing the contrast between Alice’s drowsy boredom and this absurd creature.',
            color: '#fef08a',
            createdAt: '2026-09-08T10:15:00.000Z',
          },
          {
            id: 'comment-alice-2',
            chapterId: 'chapter1',
            selectedText: 'took a watch out of its waistcoat-pocket',
            comment: 'The watch is a key symbol representing adult Victorian anxiety over time, appointments, and punctuality.',
            color: '#bbf7d0',
            createdAt: '2026-09-08T10:20:00.000Z',
          },
        ],
    characters: isPt
      ? [
          {
            id: 'char-alice',
            name: 'Alice',
            role: 'Protagonist',
            archetype: 'The Curious Explorer',
            age: '7',
            occupation: 'Estudante Vitoriana',
            aliases: 'Mary Ann, A Menina Curiosa',
            oneLineSummary: 'Uma garota educada e intensamente curiosa que mergulha numa toca de coelho rumo a um mundo de lógica nonsense.',
            color: '#3b82f6',
            traits: [
              { id: 't1', text: 'Seguir o Coelho Branco pela toca', completed: true, category: 'goal' },
              { id: 't2', text: 'Beber da garrafa com o rótulo "BEBA-ME"', completed: true, category: 'action' },
              { id: 't3', text: 'Manter a etiqueta vitoriana diante do absurdo', completed: true, category: 'personality' },
              { id: 't4', text: 'Decifrar a charada do Chapeleiro Maluco', completed: false, category: 'goal' },
              { id: 't5', text: 'Enfrentar a Rainha de Copas no tribunal', completed: false, category: 'goal' },
            ],
            appearance: 'Avental branco sobre vestido azul-celeste, meias brancas, sapatos pretos e longos cabelos loiros com tiara.',
            personality: 'Curiosa, lógica, cortês porém obstinada. Costuma recitar lições escolares quando fica nervosa.',
            motivation: 'Encontrar a passagem para o jardim maravilhoso e, por fim, voltar para casa.',
            backstory: 'Cresceu na Inglaterra vitoriana e acha o livro de história de sua irmã entediante por não ter imagens.',
            notes: 'Cresce e encolhe repetidamente. Representa a racionalidade infantil desafiando a loucura do mundo adulto.',
          },
          {
            id: 'char-white-rabbit',
            name: 'O Coelho Branco',
            role: 'Supporting',
            archetype: 'The Herald',
            age: 'Meia-idade',
            occupation: 'Arauto Real & Servo da Rainha',
            aliases: 'Sr. Coelho',
            oneLineSummary: 'Um coelho nervoso e obcecado pelo tempo que desencadeia a jornada de Alice.',
            color: '#eab308',
            traits: [
              { id: 'tr1', text: 'Checar o relógio de bolso com ansiedade', completed: true, category: 'habit' },
              { id: 'tr2', text: 'Confundir Alice com a criada Mary Ann', completed: true, category: 'action' },
              { id: 'tr3', text: 'Entregar a convocação real para o croquet', completed: false, category: 'goal' },
              { id: 'tr4', text: 'Tocar a trombeta real no julgamento', completed: false, category: 'goal' },
            ],
            appearance: 'Pelo branco macio, olhos cor-de-rosa, colete xadrez elegante, luvas brancas e relógio de bolso.',
            personality: 'Perpetuamente aflito, subserviente com autoridades, assustadiço.',
            motivation: 'Evitar atrasos com a Duquesa e fugir da fúria da Rainha de Copas.',
            backstory: 'Arauto de alto escalão da corte real incumbido de fazer os anúncios solenes.',
            notes: 'Personagem catalisador: sua corrida apressada dá início a toda a narrativa.',
          },
          {
            id: 'char-mad-hatter',
            name: 'O Chapeleiro Maluco',
            role: 'Supporting',
            archetype: 'The Trickster / Jester',
            age: 'Indeterminado',
            occupation: 'Chapeleiro & Tomador de Chá Perpétuo',
            aliases: 'Chapeleiro',
            oneLineSummary: 'Um excêntrico chapeleiro preso no chá eterno das seis horas com a Lebre de Março.',
            color: '#8b5cf6',
            traits: [
              { id: 'th1', text: 'Prender o Tempo às 6 horas do chá para sempre', completed: true, category: 'action' },
              { id: 'th2', text: 'Perguntar por que um corvo se parece com uma escrivaninha', completed: true, category: 'personality' },
              { id: 'th3', text: 'Mudar de lugar na mesa para achar xícaras limpas', completed: false, category: 'habit' },
              { id: 'th4', text: 'Testemunhar no tribunal com pão com manteiga na mão', completed: false, category: 'goal' },
            ],
            appearance: 'Cartola alta com etiqueta de preço 10/6, casaco descombinado, laço e migalhas de torrada.',
            personality: 'Enigmático, argumentativo, alheio às convenções sociais, amante de trocadilhos lógicos.',
            motivation: 'Ficar em paz com o Tempo e garantir que o chá nunca acabe.',
            backstory: 'Brigou com o Tempo no concerto da Rainha e, como castigo, o Tempo parou às 6 horas.',
            notes: 'A cena do chá maluco é uma das mais consagradas da literatura mundial.',
          },
          {
            id: 'char-queen-hearts',
            name: 'A Rainha de Copas',
            role: 'Antagonist',
            archetype: 'The Tyrant',
            age: 'Madura',
            occupation: 'Soberana do País das Maravilhas',
            aliases: 'Sua Majestade Real',
            oneLineSummary: 'Uma monarca furiosa cujo remédio instantâneo para qualquer problema é a decapitação.',
            color: '#ef4444',
            traits: [
              { id: 'tq1', text: 'Exigir que rosas brancas sejam pintadas de vermelho', completed: true, category: 'action' },
              { id: 'tq2', text: 'Gritar "Cortem-lhe a cabeça!" a qualquer provocação', completed: true, category: 'habit' },
              { id: 'tq3', text: 'Jogar croquet com flamingos e ouriços', completed: false, category: 'goal' },
              { id: 'tq4', text: 'Sentenciar o Valete antes do veredito', completed: false, category: 'goal' },
            ],
            appearance: 'Vestido real vermelho e preto, coroa dourada e cetro em formato de coração.',
            personality: 'Temperamento vulcânico, tirânica, dominadora, facilmente lisonjeada.',
            motivation: 'Impor controle absoluto e punir qualquer insubordinação.',
            backstory: 'Governa através do terror teatral, embora raramente as execuções sejam cumpridas.',
            notes: 'Antagonista do clímax que desafia Alice antes de seu despertar.',
          },
        ]
      : [
          {
            id: 'char-alice',
            name: 'Alice',
            role: 'Protagonist',
            archetype: 'The Curious Explorer',
            age: '7',
            occupation: 'Victorian Schoolgirl',
            aliases: 'Mary Ann, The Little Girl',
            oneLineSummary: 'A polite, intensely curious girl who tumbles down a rabbit hole into a world of nonsense logic.',
            color: '#3b82f6',
            traits: [
              { id: 't1', text: 'Follow the White Rabbit down the rabbit hole', completed: true, category: 'goal' },
              { id: 't2', text: 'Drink from the bottle marked "DRINK ME"', completed: true, category: 'action' },
              { id: 't3', text: 'Maintain Victorian etiquette despite surreal insanity', completed: true, category: 'personality' },
              { id: 't4', text: 'Solve the Mad Hatter’s raven riddle', completed: false, category: 'goal' },
              { id: 't5', text: 'Stand up to the Queen of Hearts in the courtroom', completed: false, category: 'goal' },
            ],
            appearance: 'Neat pinafore dress over a sky-blue frock, white stockings, black Mary Jane shoes, and long golden-blonde hair held back by a headband.',
            personality: 'Inquisitive, logical to a fault, polite yet stubborn. Prone to reciting school lessons when flustered.',
            motivation: 'To find her way into the beautiful garden glimpsed through the tiny door, and ultimately return home.',
            backstory: 'Growing up in Victorian England, she finds her sister’s history book boring because it lacks pictures and conversations.',
            notes: 'Grows and shrinks repeatedly depending on what she eats or drinks. Represents childlike rationality confronting adult absurdity.',
          },
          {
            id: 'char-white-rabbit',
            name: 'The White Rabbit',
            role: 'Supporting',
            archetype: 'The Herald',
            age: 'Middle-aged',
            occupation: 'Royal Herald & Servant to the Queen',
            aliases: 'Mr. Rabbit',
            oneLineSummary: 'A nervous, time-obsessed rabbit in a waistcoat who catalyzes Alice’s journey.',
            color: '#eab308',
            traits: [
              { id: 'tr1', text: 'Check pocket watch anxiously', completed: true, category: 'habit' },
              { id: 'tr2', text: 'Mistake Alice for maidservant Mary Ann', completed: true, category: 'action' },
              { id: 'tr3', text: 'Deliver the royal summons for the croquet match', completed: false, category: 'goal' },
              { id: 'tr4', text: 'Sound trumpet herald at the trial of the Knave', completed: false, category: 'goal' },
            ],
            appearance: 'Fluffy white fur, pink eyes, crisp checked waistcoat, white kid gloves, and a brass pocket watch on a chain.',
            personality: 'Perpetually panicky, servile toward authority, fussy and easily startled by Alice’s size shifts.',
            motivation: 'Avoid being late for the Duchess and the wrath of the Queen of Hearts.',
            backstory: 'High-ranking court herald trusted with royal announcements and carrying the Queen’s fans.',
            notes: 'Catalyst character: his frantic sprint down the rabbit hole kicks off the entire adventure.',
          },
          {
            id: 'char-mad-hatter',
            name: 'The Mad Hatter',
            role: 'Supporting',
            archetype: 'The Trickster / Jester',
            age: 'Indeterminate',
            occupation: 'Milliner & Perpetual Tea Drinker',
            aliases: 'Hatter',
            oneLineSummary: 'An eccentric milliner trapped in permanent 6:00 tea time with the March Hare.',
            color: '#8b5cf6',
            traits: [
              { id: 'th1', text: 'Trap Time at 6 o’clock tea forever', completed: true, category: 'action' },
              { id: 'th2', text: 'Ask why a raven is like a writing-desk', completed: true, category: 'personality' },
              { id: 'th3', text: 'Switch places at the tea table to find clean cups', completed: false, category: 'habit' },
              { id: 'th4', text: 'Testify with teacup and bread-and-butter in hand at the trial', completed: false, category: 'goal' },
            ],
            appearance: 'Towering top hat with a 10/6 price tag tucked in the band, eccentric mismatched coat, bowtie, and tea crumbs.',
            personality: 'Riddling, argumentative, oblivious to social decorum, lives by unhinged wordplay and logic puzzles.',
            motivation: 'Stay on the good side of Time (with whom he had a falling out) and keep tea flowing.',
            backstory: 'Quarreled with Time at the Queen’s concert when singing "Twinkle, Twinkle, Little Bat". As punishment, Time stopped.',
            notes: 'Suffering from mercury toxicity (hatter’s disease). Iconic tea party chapter is a masterclass in absurdist dialogue.',
          },
          {
            id: 'char-queen-hearts',
            name: 'The Queen of Hearts',
            role: 'Antagonist',
            archetype: 'The Tyrant',
            age: 'Mature',
            occupation: 'Ruler of Wonderland',
            aliases: 'Her Royal Majesty',
            oneLineSummary: 'A furious, crimson monarch whose immediate solution to any grievance is decapitation.',
            color: '#ef4444',
            traits: [
              { id: 'tq1', text: 'Demand white roses be painted red', completed: true, category: 'action' },
              { id: 'tq2', text: 'Shout "Off with their heads!" at slightest offense', completed: true, category: 'habit' },
              { id: 'tq3', text: 'Play flamingo-and-hedgehog croquet game', completed: false, category: 'goal' },
              { id: 'tq4', text: 'Sentence the Knave before the verdict is given', completed: false, category: 'goal' },
            ],
            appearance: 'Voluminous red and black royal gown, gold crown perched precariously, brandishing a flaming croquet mallet or sceptre.',
            personality: 'Furious temper, tyrannical, domineering, irrational, easily flattered.',
            motivation: 'Enforce absolute control and punish any perceived insubordination across Wonderland.',
            backstory: 'Monarch alongside the meek King of Hearts; rules through theatrical terror though executioner rarely follows through.',
            notes: 'Climactic antagonist who orders Alice’s execution, prompting Alice’s awakening.',
          },
        ],
    locations: [],
    timelines: [
      {
        id: 'timeline-alice-main',
        title: isPt ? 'Arco Narrativo do País das Maravilhas' : 'Wonderland Narrative Arc',
        description: isPt
          ? 'Sequência cronológica dos encontros fantásticos, transformações e julgamentos de Alice.'
          : "Chronological sequence of Alice's whimsical encounters, transformations, and trials across Wonderland.",
        timescale: 'hours',
        color: '#8b5cf6',
        totalUnitsPerSegment: 24,
        unitStep: 2,
        segments: isPt
          ? [
              {
                id: 'seg-alice-day-1',
                name: 'Dia 1: Pela Toca do Coelho',
                startOffset: -18,
                zeroHour: 18,
                events: [
                  {
                    id: 'ev-alice-1',
                    title: 'Pela Toca do Coelho',
                    description: 'Alice persegue o Coelho Branco e despenca pelo poço sem fim.',
                    start: 10.0,
                    duration: 2.0,
                    color: '#3b82f6',
                    lane: 0,
                    characters: ['char-alice', 'char-white-rabbit'],
                  },
                  {
                    id: 'ev-alice-2',
                    title: 'A Pressa do Coelho',
                    description: 'O Coelho Branco consulta o relógio de bolso e dispara pelo túnel.',
                    start: 11.0,
                    duration: 1.5,
                    color: '#d89614',
                    lane: 1,
                    characters: ['char-white-rabbit'],
                  },
                  {
                    id: 'ev-alice-3',
                    title: 'Beba-me & Coma-me',
                    description: 'Alice encolhe e cresce repetidamente no salão de portas trancadas.',
                    start: 12.5,
                    duration: 2.5,
                    color: '#8b5cf6',
                    lane: 0,
                    characters: ['char-alice'],
                  },
                  {
                    id: 'ev-alice-4',
                    title: 'Mar de Lágrimas',
                    description: 'Alice chora um lago de lágrimas gigante e nada até a margem com os animais.',
                    start: 14.5,
                    duration: 3.0,
                    color: '#3a6982',
                    lane: 1,
                    characters: ['char-alice'],
                  },
                  {
                    id: 'ev-alice-5',
                    title: 'A Corrida Eleitoral',
                    description: 'Os animais encharcados correm em círculos para se secarem.',
                    start: 17.0,
                    duration: 2.5,
                    color: '#009a34',
                    lane: 0,
                    characters: ['char-alice'],
                  },
                  {
                    id: 'ev-alice-6',
                    title: 'Conselhos da Lagarta',
                    description: 'Fumando narguilé sobre um cogumelo, a Lagarta questiona a identidade de Alice.',
                    start: 19.0,
                    duration: 2.8,
                    color: '#2d5a36',
                    lane: 1,
                    characters: ['char-alice'],
                  },
                ],
              },
              {
                id: 'seg-alice-day-2',
                name: 'Dia 2: O Reino da Rainha',
                startOffset: 6,
                zeroHour: -6,
                events: [
                  {
                    id: 'ev-alice-7',
                    title: 'Porco e Pimenta',
                    description: 'Alice visita a cozinha da Duquesa e conhece o Gato de Cheshire.',
                    start: 8.5,
                    duration: 2.5,
                    color: '#00ab2e',
                    lane: 0,
                    characters: ['char-alice'],
                  },
                  {
                    id: 'ev-alice-8',
                    title: 'Um Chá de Loucos',
                    description: 'Presos no horário perpétuo das seis horas, o Chapeleiro e a Lebre bombardeiam Alice com enigmas.',
                    start: 10.5,
                    duration: 3.5,
                    color: '#8b5cf6',
                    lane: 1,
                    characters: ['char-alice', 'char-mad-hatter'],
                  },
                  {
                    id: 'ev-alice-9',
                    title: 'Pintando as Rosas',
                    description: 'Os jardineiros de cartas pintam freneticamente as rosas brancas de vermelho.',
                    start: 13.5,
                    duration: 2.0,
                    color: '#ff1721',
                    lane: 0,
                    characters: ['char-alice', 'char-white-rabbit'],
                  },
                  {
                    id: 'ev-alice-10',
                    title: 'O Croquet da Rainha',
                    description: 'Partida real de croquet com flamingos e ouriços sob gritos de "Cortem-lhes as cabeças!".',
                    start: 15.0,
                    duration: 3.5,
                    color: '#ef4444',
                    lane: 1,
                    characters: ['char-alice', 'char-queen-hearts', 'char-white-rabbit'],
                  },
                  {
                    id: 'ev-alice-11',
                    title: 'A História da Falsa Tartaruga',
                    description: 'O Grifo leva Alice para ouvir a melancólica canção da Falsa Tartaruga.',
                    start: 18.0,
                    duration: 2.5,
                    color: '#0055d4',
                    lane: 0,
                    characters: ['char-alice'],
                  },
                  {
                    id: 'ev-alice-12',
                    title: 'O Julgamento do Valete',
                    description: 'O tribunal se reúne para julgar o roubo das tortas; Alice cresce, desafia as cartas e acorda na margem do rio.',
                    start: 20.0,
                    duration: 3.0,
                    color: '#7a1a1e',
                    lane: 1,
                    characters: ['char-alice', 'char-queen-hearts', 'char-mad-hatter', 'char-white-rabbit'],
                  },
                ],
              },
            ]
          : [
              {
                id: 'seg-alice-day-1',
                name: 'Day 1: Down the Rabbit Hole',
                startOffset: -18,
                zeroHour: 18,
                events: [
                  {
                    id: 'ev-alice-1',
                    title: 'Down the Rabbit Hole',
                    description: 'Alice follows the frantic White Rabbit and falls down the endless well of cupboards and bookshelves.',
                    start: 10.0,
                    duration: 2.0,
                    color: '#3b82f6',
                    lane: 0,
                    characters: ['char-alice', 'char-white-rabbit'],
                  },
                  {
                    id: 'ev-alice-2',
                    title: "The Rabbit's Hurry",
                    description: 'The White Rabbit checks his pocket watch and dashes away down the subterranean corridor.',
                    start: 11.0,
                    duration: 1.5,
                    color: '#d89614',
                    lane: 1,
                    characters: ['char-white-rabbit'],
                  },
                  {
                    id: 'ev-alice-3',
                    title: 'Drink Me & Eat Me',
                    description: 'Alice repeatedly shrinks and grows in the hallway of locked doors, leaving the golden key behind.',
                    start: 12.5,
                    duration: 2.5,
                    color: '#8b5cf6',
                    lane: 0,
                    characters: ['char-alice'],
                  },
                  {
                    id: 'ev-alice-4',
                    title: 'Pool of Tears',
                    description: 'Alice sheds a giant pool of tears at nine feet tall, then swims ashore alongside the Mouse and Dodo.',
                    start: 14.5,
                    duration: 3.0,
                    color: '#3a6982',
                    lane: 1,
                    characters: ['char-alice'],
                  },
                  {
                    id: 'ev-alice-5',
                    title: 'The Caucus Race',
                    description: 'The drenched animals hold a circular race to get dry, declaring everyone a winner with comfit prizes.',
                    start: 17.0,
                    duration: 2.5,
                    color: '#009a34',
                    lane: 0,
                    characters: ['char-alice'],
                  },
                  {
                    id: 'ev-alice-6',
                    title: 'Advice from a Caterpillar',
                    description: 'Perched upon a mushroom smoking hookah, the Caterpillar questions Alice\'s identity and explains height control.',
                    start: 19.0,
                    duration: 2.8,
                    color: '#2d5a36',
                    lane: 1,
                    characters: ['char-alice'],
                  },
                ],
              },
              {
                id: 'seg-alice-day-2',
                name: "Day 2: The Queen's Realm",
                startOffset: 6,
                zeroHour: -6,
                events: [
                  {
                    id: 'ev-alice-7',
                    title: 'Pig and Pepper',
                    description: "Alice visits the Duchess's kitchen, encounters the Cheshire Cat, and rescues the infant that turns into a pig.",
                    start: 8.5,
                    duration: 2.5,
                    color: '#00ab2e',
                    lane: 0,
                    characters: ['char-alice'],
                  },
                  {
                    id: 'ev-alice-8',
                    title: 'A Mad Tea-Party',
                    description: 'Trapped at permanent 6 o\'clock tea time, the Hatter, March Hare, and Dormouse bombard Alice with riddles.',
                    start: 10.5,
                    duration: 3.5,
                    color: '#8b5cf6',
                    lane: 1,
                    characters: ['char-alice', 'char-mad-hatter'],
                  },
                  {
                    id: 'ev-alice-9',
                    title: 'Painting the Roses',
                    description: 'Three card gardeners feverishly paint white roses crimson before the Queen of Hearts arrives.',
                    start: 13.5,
                    duration: 2.0,
                    color: '#ff1721',
                    lane: 0,
                    characters: ['char-alice', 'char-white-rabbit'],
                  },
                  {
                    id: 'ev-alice-10',
                    title: "The Queen's Croquet",
                    description: 'Royal croquet with flamingo mallets and hedgehog balls amid constant cries of "Off with their heads!".',
                    start: 15.0,
                    duration: 3.5,
                    color: '#ef4444',
                    lane: 1,
                    characters: ['char-alice', 'char-queen-hearts', 'char-white-rabbit'],
                  },
                  {
                    id: 'ev-alice-11',
                    title: "The Mock Turtle's Story",
                    description: 'The Gryphon escorts Alice to hear the melancholic Mock Turtle sing of the Lobster Quadrille.',
                    start: 18.0,
                    duration: 2.5,
                    color: '#0055d4',
                    lane: 0,
                    characters: ['char-alice'],
                  },
                  {
                    id: 'ev-alice-12',
                    title: 'Trial of the Knave',
                    description: "The court convenes over stolen tarts; Alice grows to full size, defies the Queen's cards, and awakens on the riverbank.",
                    start: 20.0,
                    duration: 3.0,
                    color: '#7a1a1e',
                    lane: 1,
                    characters: ['char-alice', 'char-queen-hearts', 'char-mad-hatter', 'char-white-rabbit'],
                  },
                ],
              },
            ],
      },
    ],
  };

  return parsedBook;
}

/**
 * Creates a pristine blank EPUB project ready for writing.
 */
export async function createNewBlankEpubBook(
  title?: string,
  author?: string,
  lang: string = 'en'
): Promise<EpubBook> {
  const isPt = lang === 'pt-BR' || lang.startsWith('pt');
  const finalTitle = title || (isPt ? 'Manuscrito Sem Título' : 'Untitled Manuscript');
  const finalAuthor = author || (isPt ? 'Nome do Autor' : 'Author Name');
  const chapter1Name = isPt ? 'Capítulo 1' : 'Chapter 1';
  const tocName = isPt ? 'Sumário' : 'Table of Contents';
  const placeholderBody = isPt
    ? 'Comece a escrever sua história aqui. Use a barra de ferramentas de formatação acima para adicionar títulos, citações, diálogos e cenas.'
    : 'Begin writing your story here. Use the formatting toolbar above to add headings, quotes, dialogue, and scenes.';

  const zip = new JSZip();

  // 1. mimetype (Uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. container.xml
  zip.folder('META-INF')?.file(
    'container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // 3. Simple Cover SVG
  const coverSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <rect x="40" y="40" width="520" height="820" rx="8" fill="none" stroke="#6366f1" stroke-width="2" stroke-opacity="0.6"/>
  <text x="300" y="220" font-family="sans-serif" font-size="18" fill="#c7d2fe" font-weight="600" letter-spacing="4" text-anchor="middle">${finalAuthor.toUpperCase()}</text>
  <line x1="220" y1="245" x2="380" y2="245" stroke="#818cf8" stroke-width="1.5"/>
  <text x="300" y="400" font-family="serif" font-size="40" fill="#ffffff" font-weight="bold" text-anchor="middle">${finalTitle}</text>
  <text x="300" y="750" font-family="sans-serif" font-size="13" fill="#818cf8" letter-spacing="3" text-anchor="middle">${isPt ? 'PRIMEIRA EDIÇÃO' : 'FIRST EDITION'}</text>
</svg>`;
  zip.folder('OEBPS')?.folder('Images')?.file('cover.svg', coverSvg);

  // 4. Stylesheet
  const css = `
body {
  font-family: 'Merriweather', Georgia, serif;
  line-height: 1.75;
  color: #1a1a1a;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  max-width: 44rem;
}
h1, h2, h3 {
  font-family: 'Outfit', sans-serif;
  color: #111827;
  margin-top: 2rem;
  margin-bottom: 1rem;
}
p {
  margin-bottom: 1.25rem;
  text-indent: 1.5rem;
}
p:first-of-type {
  text-indent: 0;
}
`;
  zip.folder('OEBPS')?.folder('Styles')?.file('style.css', css);

  // 5. Chapter 1
  const ch1 = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${isPt ? 'pt-BR' : 'en'}">
<head>
  <title>${chapter1Name}</title>
  <link rel="stylesheet" type="text/css" href="../Styles/style.css"/>
</head>
<body>
  <section class="chapter">
    <h1>${chapter1Name}</h1>
    <p>${placeholderBody}</p>
  </section>
</body>
</html>`;
  zip.folder('OEBPS')?.folder('Text')?.file('chapter1.xhtml', ch1);

  // 6. Navigation
  const nav = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${isPt ? 'pt-BR' : 'en'}">
<head><title>${tocName}</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${tocName}</h1>
    <ol>
      <li><a href="Text/chapter1.xhtml">${chapter1Name}</a></li>
    </ol>
  </nav>
</body>
</html>`;
  zip.folder('OEBPS')?.file('nav.xhtml', nav);

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:new-manuscript"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${finalTitle}</text></docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>${chapter1Name}</text></navLabel>
      <content src="Text/chapter1.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;
  zip.folder('OEBPS')?.file('toc.ncx', ncx);

  // 7. OPF
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="pub-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:new-manuscript</dc:identifier>
    <dc:title>${finalTitle}</dc:title>
    <dc:creator id="creator">${finalAuthor}</dc:creator>
    <dc:language>${isPt ? 'pt-BR' : 'en'}</dc:language>
    <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString()}</meta>
    <meta name="cover" content="cover-image"/>
  </metadata>
  <manifest>
    <item id="cover-image" href="Images/cover.svg" media-type="image/svg+xml" properties="cover-image"/>
    <item id="style" href="Styles/style.css" media-type="text/css"/>
    <item id="chapter1" href="Text/chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
  </spine>
  <guide>
    <reference type="cover" title="Cover" href="Images/cover.svg"/>
    <reference type="toc" title="Table of Contents" href="toc.ncx"/>
  </guide>
</package>`;
  zip.folder('OEBPS')?.file('content.opf', opf);

  const epubBlob = await zip.generateAsync({
    type: 'uint8array',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
  });

  return await parseEpub(epubBlob, `${finalTitle}.epub`);
}
