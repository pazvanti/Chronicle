@echo off
REM Chronicle 2K Headless Video Exporter
REM Records the 62s showreel silently at 2560x1440 with 320kbps audio and no UI/black bars.

echo ================================================================
echo Starting Chronicle 2K Showreel Background Exporter...
echo ================================================================
cd /d "%~dp0\.."
node promo_video_2\record_2k.js %*
pause
