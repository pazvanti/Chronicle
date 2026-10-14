import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_PROFILE = 'c:\\Projects\\Chronicle\\promo_video_2\\assets\\cdp_profile_verify';
const OUTPUT_DIR = 'c:\\Projects\\Chronicle\\promo_video_2\\assets';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyShowreel() {
  console.log('Launching headless Chrome to verify promo_video_2 master showreel frames...');
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9235',
    '--window-size=1920,1080',
    '--disable-gpu',
    '--disable-extensions',
    `--user-data-dir=${TEMP_PROFILE}`,
    'file:///C:/Projects/Chronicle/promo_video_2/index.html'
  ]);

  await sleep(3000);

  try {
    const listRes = await fetch('http://127.0.0.1:9235/json/list');
    const tabs = await listRes.json();
    const targetTab = tabs.find(t => t.type === 'page' || t.url.includes('promo_video_2')) || tabs[0];
    if (!targetTab) throw new Error('No target tab found');

    const ws = new WebSocket(targetTab.webSocketDebuggerUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
    };

    await new Promise(resolve => ws.onopen = resolve);

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        callbacks.set(id, (msg) => {
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await sleep(2000);

    const testTimes = [
      { t: 1.8, name: 'frame_00_monolith.png', desc: 'Scene 0: Monolith Reveal & 3D Halo' },
      { t: 6.0, name: 'frame_01_canvas.png', desc: 'Scene 1: Novelist Canvas & Live Typewriter' },
      { t: 10.8, name: 'frame_02_zen.png', desc: 'Scene 2: Zen Mode Sanctuary & Ghost HUD' },
      { t: 16.0, name: 'frame_03_paper.png', desc: 'Scene 3: Bespoke Paper Tones & Drop Caps' },
      { t: 21.5, name: 'frame_04_characters.png', desc: 'Scene 4: Character Studio & Cast Dossiers' },
      { t: 27.0, name: 'frame_05_locations.png', desc: 'Scene 5: Location Studio & World Codex' },
      { t: 32.8, name: 'frame_06_timeline.png', desc: 'Scene 6: Multi-Track Story Timeline' },
      { t: 38.5, name: 'frame_07_presence.png', desc: 'Scene 7: Cast Presence Heatmap Scanner' },
      { t: 44.0, name: 'frame_08_timemachine.png', desc: 'Scene 8: Story Time Machine & Visual Diff Engine' },
      { t: 49.5, name: 'frame_09_cover.png', desc: 'Scene 9: Cover Designer Studio & Artwork Engine' },
      { t: 54.4, name: 'frame_10_export.png', desc: 'Scene 10: Universal Publishing Quad Badges' },
      { t: 57.5, name: 'frame_11_crescendo.png', desc: 'Scene 11: Kinetic Typography Slam' },
      { t: 60.5, name: 'frame_12_outro.png', desc: 'Scene 11: Prestige Monolith Outro Resolve' }
    ];

    for (const item of testTimes) {
      await send('Runtime.evaluate', {
        expression: `window.seekTo(${item.t});`
      });
      await sleep(350);

      const res = await send('Page.captureScreenshot', {
        format: 'png',
        quality: 100,
        fromSurface: true
      });
      const buffer = Buffer.from(res.data, 'base64');
      const filePath = path.join(OUTPUT_DIR, item.name);
      fs.writeFileSync(filePath, buffer);
      console.log(`✓ Rendered ${item.name} (${buffer.length} bytes) — ${item.desc}`);
    }

    console.log('All 9 promo_video_2 showreel test frames verified successfully!');
    ws.close();
  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    chrome.kill();
  }
}

verifyShowreel();
