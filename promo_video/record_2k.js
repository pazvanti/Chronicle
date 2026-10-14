import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Master configuration for 2K (2560x1440) QHD render
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG_PATH = 'C:\\Users\\pazva\\Downloads\\ffmpeg-6.1.1-full_build\\ffmpeg-6.1.1-full_build\\bin\\ffmpeg.exe';
const TEMP_PROFILE = 'c:\\Projects\\Chronicle\\promo_video_2\\assets\\cdp_profile_2k';
const AUDIO_PATH = 'c:\\Projects\\Chronicle\\promo_video_2\\assets\\track_vivacity.mp3';
const OUTPUT_MP4 = 'c:\\Projects\\Chronicle\\promo_video_2\\Chronicle_2K_Showreel.mp4';
const PORT = 9295;

const WIDTH = 2560;
const HEIGHT = 1440;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CLI argument parsing (e.g. node record_2k.js --fps=60 --duration=10)
const args = process.argv.slice(2);
const fpsArg = args.find(a => a.startsWith('--fps='));
const durationArg = args.find(a => a.startsWith('--duration='));
const FPS = fpsArg ? parseInt(fpsArg.split('=')[1], 10) : 30; // 30 FPS default for fast rendering, or 60 FPS
const DURATION = durationArg ? parseFloat(durationArg.split('=')[1]) : 62.0;

async function record2KShowreel() {
  console.log(`================================================================`);
  console.log(`🎬 CHRONICLE 2K (2560x1440) SHOWREEL BACKGROUND EXPORTER`);
  console.log(`Resolution:  ${WIDTH}x${HEIGHT} (16:9 QHD, Zero Black Bars)`);
  console.log(`Framerate:   ${FPS} FPS`);
  console.log(`Duration:    ${DURATION}s`);
  console.log(`Soundtrack:  ${AUDIO_PATH}`);
  console.log(`Output:      ${OUTPUT_MP4}`);
  console.log(`Mode:        Silent Background Headless`);
  console.log(`================================================================\n`);

  if (!fs.existsSync(CHROME_PATH)) {
    console.error('Error: Chrome not found at', CHROME_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(FFMPEG_PATH)) {
    console.error('Error: FFmpeg not found at', FFMPEG_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(AUDIO_PATH)) {
    console.error('Error: Audio track not found at', AUDIO_PATH);
    process.exit(1);
  }

  // 1. Launch Headless Chrome in silent background mode
  console.log('1. Launching silent headless Chrome instance at 2560x1440...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    '--disable-gpu',
    '--disable-extensions',
    '--mute-audio',
    '--hide-scrollbars',
    `--user-data-dir=${TEMP_PROFILE}`,
    'file:///C:/Projects/Chronicle/promo_video_2/index.html'
  ]);

  await sleep(2500);

  // 2. Connect to Chrome via CDP WebSocket
  let tabs = [];
  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    tabs = await listRes.json();
  } catch (err) {
    console.error(`Could not connect to Chrome on port ${PORT}:`, err.message);
    chrome.kill();
    process.exit(1);
  }

  const targetTab = tabs.find(t => t.type === 'page' || t.url.includes('promo_video_2')) || tabs[0];
  if (!targetTab) {
    console.error('No target tab found in Chrome.');
    chrome.kill();
    process.exit(1);
  }

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

  // Enforce precise 2560x1440 viewport metrics
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Enable clean recording mode: removes all player docks, timecodes, and 4k resolution pills
  await send('Runtime.evaluate', {
    expression: 'document.body.classList.add("clean-rec");'
  });
  console.log('✓ Clean recording active: all player controls, docks, and HUD chips hidden.');

  await sleep(500);

  // 3. Spawn FFmpeg process configured for 2K H.264 + 320k AAC
  console.log('2. Initializing FFmpeg video encoding pipeline...');
  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', FPS.toString(),
    '-i', '-', // standard input image stream from Chrome
    '-i', AUDIO_PATH,
    '-vf', `scale=${WIDTH}:${HEIGHT}`,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '17', // visually lossless broadcast quality
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-t', DURATION.toString(),
    OUTPUT_MP4
  ];

  const ffmpeg = spawn(FFMPEG_PATH, ffmpegArgs);
  let ffmpegStderr = '';
  ffmpeg.stderr.on('data', (d) => {
    ffmpegStderr += d.toString();
  });
  ffmpeg.stdin.on('error', (err) => {
    console.error('\nFFmpeg stdin error:', err.message);
  });

  const totalFrames = Math.floor(DURATION * FPS);
  const frameDelta = 1 / FPS;

  console.log(`3. Rendering and encoding ${totalFrames} frames silently in the background...\n`);
  const startTime = Date.now();

  try {
    for (let f = 0; f < totalFrames; f++) {
      const t = f * frameDelta;

      // Mathematically seek to timestamp
      await send('Runtime.evaluate', {
        expression: `window.seekTo(${t.toFixed(4)});`
      });

      // Capture screenshot in high quality JPEG (visually identical to PNG, 5x faster transfer)
      const res = await send('Page.captureScreenshot', {
        format: 'jpeg',
        quality: 98
      });

      const buffer = Buffer.from(res.data, 'base64');
      const canWrite = ffmpeg.stdin.write(buffer);

      if (!canWrite) {
        await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
      }

      // Log progress every 5%
      const step = Math.max(1, Math.floor(totalFrames / 20));
      if (f % step === 0 || f === totalFrames - 1) {
        const pct = ((f + 1) / totalFrames * 100).toFixed(1).padStart(5, ' ');
        const elapsedSec = (Date.now() - startTime) / 1000;
        const fpsActual = ((f + 1) / elapsedSec).toFixed(1);
        const remainingSec = Math.max(0, (totalFrames - (f + 1)) / (f + 1) * elapsedSec).toFixed(0);
        process.stdout.write(`\r[${pct}%] Frame ${f + 1}/${totalFrames} | ${t.toFixed(1)}s / ${DURATION}s | Speed: ${fpsActual} fps | ETA: ~${remainingSec}s  `);
      }
    }

    console.log('\n\n4. Finalizing MP4 container and muxing audio...');
    ffmpeg.stdin.end();

    await new Promise((resolve, reject) => {
      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}\nStderr:\n${ffmpegStderr}`));
      });
    });

    const stats = fs.statSync(OUTPUT_MP4);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    const totalElapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n================================================================`);
    console.log(`🎉 2K SHOWREEL EXPORTED SUCCESSFULLY!`);
    console.log(`File:       ${OUTPUT_MP4}`);
    console.log(`Resolution: ${WIDTH}x${HEIGHT} (Zero Black Bars)`);
    console.log(`Audio:      320 kbps Stereo AAC (Synced)`);
    console.log(`Duration:   ${DURATION}s (${totalFrames} frames)`);
    console.log(`File Size:  ${sizeMb} MB`);
    console.log(`Render Time: ${totalElapsedSec}s`);
    console.log(`================================================================\n`);
  } catch (err) {
    console.error('\nRecording failed:', err);
  } finally {
    ws.close();
    chrome.kill();
  }
}

record2KShowreel();
