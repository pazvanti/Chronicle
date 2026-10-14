import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FFMPEG_PATH = 'C:\\Users\\pazva\\Downloads\\ffmpeg-6.1.1-full_build\\ffmpeg-6.1.1-full_build\\bin\\ffmpeg.exe';
const TEMP_PROFILE = 'c:\\Projects\\Chronicle\\promo_video_2\\assets\\cdp_profile_record';
const AUDIO_PATH = 'c:\\Projects\\Chronicle\\promo_video_2\\assets\\track_vivacity.mp3';
const OUTPUT_MP4 = 'c:\\Projects\\Chronicle\\promo_video_2\\Chronicle_60s_Master_Showreel.mp4';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Parse CLI flags (e.g. node record_showreel.js --fps=30 --preview=10)
const args = process.argv.slice(2);
const fpsArg = args.find(a => a.startsWith('--fps='));
const previewArg = args.find(a => a.startsWith('--duration='));
const FPS = fpsArg ? parseInt(fpsArg.split('=')[1], 10) : 30; // default 30 fps for speedy compilation, pass --fps=60 for 60fps
const DURATION = previewArg ? parseFloat(previewArg.split('=')[1]) : 62.0;

async function recordShowreel() {
  console.log(`========================================================`);
  console.log(`CHRONICLE SHOWREEL MASTER MP4 EXPORTER`);
  console.log(`Resolution: 1920x1080 | Framerate: ${FPS} FPS | Duration: ${DURATION}s`);
  console.log(`FFmpeg: ${FFMPEG_PATH}`);
  console.log(`Audio: ${AUDIO_PATH}`);
  console.log(`Output: ${OUTPUT_MP4}`);
  console.log(`========================================================\n`);

  if (!fs.existsSync(FFMPEG_PATH)) {
    console.error('Error: ffmpeg.exe not found at', FFMPEG_PATH);
    process.exit(1);
  }

  // 1. Launch Headless Chrome
  console.log('1. Launching headless Chrome renderer...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9266',
    '--window-size=1920,1080',
    '--disable-gpu',
    '--disable-extensions',
    `--user-data-dir=${TEMP_PROFILE}`,
    'file:///C:/Projects/Chronicle/promo_video_2/index.html'
  ]);

  await sleep(3000);

  // 2. Connect via CDP WebSocket
  const listRes = await fetch('http://127.0.0.1:9266/json/list');
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sleep(1000);

  // 3. Enable Clean Recording Mode (hides all UI dock, scrubber, and 4k resolution pills)
  await send('Runtime.evaluate', {
    expression: 'document.body.classList.add("clean-rec");'
  });
  console.log('✓ Clean recording mode active (all HUD/dock elements hidden)');

  // 4. Spawn FFmpeg process
  console.log('2. Spawning FFmpeg video compiler...');
  const ffmpegArgs = [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-r', FPS.toString(),
    '-i', '-', // standard input stream from Chrome
    '-i', AUDIO_PATH,
    '-vf', 'scale=1920:1080',
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
    console.error('FFmpeg stderr output:\n', ffmpegStderr);
  });

  const totalFrames = Math.floor(DURATION * FPS);
  const frameTimeDelta = 1 / FPS;

  console.log(`3. Rendering and piping ${totalFrames} frames into FFmpeg...`);
  const startTime = Date.now();

  try {
    for (let f = 0; f < totalFrames; f++) {
      const t = f * frameTimeDelta;

      // Seek to exact timestamp
      await send('Runtime.evaluate', {
        expression: `window.seekTo(${t.toFixed(4)});`
      });

      // Capture screenshot
      const res = await send('Page.captureScreenshot', {
        format: 'png',
        quality: 100,
        fromSurface: true
      });

      const buffer = Buffer.from(res.data, 'base64');
      const canWrite = ffmpeg.stdin.write(buffer);

      if (!canWrite) {
        await new Promise(res => ffmpeg.stdin.once('drain', res));
      }

      if (f % Math.max(1, Math.floor(totalFrames / 20)) === 0 || f === totalFrames - 1) {
        const pct = ((f + 1) / totalFrames * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(`\r[${pct}%] Rendered frame ${f + 1}/${totalFrames} (time: ${t.toFixed(2)}s | elapsed: ${elapsed}s)`);
      }
    }

    console.log('\n✓ All frames rendered! Finalizing MP4 encoding...');
    ffmpeg.stdin.end();

    await new Promise((resolve, reject) => {
      ffmpeg.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}\nStderr:\n${ffmpegStderr}`));
      });
    });

    const stats = fs.statSync(OUTPUT_MP4);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n🎉 MASTER SHOWREEL VIDEO EXPORTED SUCCESSFULLY!`);
    console.log(`File: ${OUTPUT_MP4}`);
    console.log(`Size: ${sizeMb} MB`);
    console.log(`Resolution: 1920x1080 @ ${FPS} FPS with 320kbps Stereo Audio`);
  } catch (err) {
    console.error('Export failed:', err);
  } finally {
    ws.close();
    chrome.kill();
  }
}

recordShowreel();
