import { CURRENT_VERSION } from '../update/updateChecker';
import { isTauri } from '../cloud/webdavClient';
import { isMac } from '../../utils/platform';

/**
 * Google Apps Script Web App URL for private feedback collection.
 * Write-only blind drop box into the author's private Google Spreadsheet.
 */
export const FEEDBACK_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzbtAS_9LXWLFM4pQQMNGCBssoKe7LfYTorV2xB1vJtbTNMUQcUS7w16FlnsK5RrUE8/exec';

export type FeedbackCategory = 'feature' | 'bug' | 'general' | 'praise';

export interface FeedbackDiagnostics {
  platform: string;
  appVersion: string;
  isDesktop: boolean;
  screenResolution: string;
  language: string;
}

export interface FeedbackSubmission {
  category: FeedbackCategory;
  message: string;
  email?: string;
  includeDiagnostics: boolean;
  diagnostics: FeedbackDiagnostics;
}

/**
 * Extracts safe, non-identifying client diagnostics for troubleshooting.
 * Never collects manuscript text, titles, or personal user data.
 */
export function getSystemDiagnostics(): FeedbackDiagnostics {
  let platform = 'Unknown';
  if (isMac) {
    platform = 'macOS';
  } else if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    if (/Win/i.test(ua)) platform = 'Windows';
    else if (/Linux/i.test(ua)) platform = 'Linux';
    else if (/Android/i.test(ua)) platform = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'iOS';
    else platform = navigator.platform || 'Unknown';
  }

  const screenRes =
    typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : 'N/A';

  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en';

  return {
    platform,
    appVersion: CURRENT_VERSION,
    isDesktop: isTauri(),
    screenResolution: screenRes,
    language: lang,
  };
}

/**
 * Submits feedback directly to the Google Apps Script Web App.
 * Uses mode: 'no-cors' with Content-Type: 'text/plain;charset=utf-8' to prevent
 * CORS preflight rejections and cross-origin redirect failures in browsers.
 */
export async function submitFeedback(
  submission: FeedbackSubmission
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      type: submission.category,
      category: submission.category,
      message: submission.message.trim(),
      email: submission.email?.trim() || 'Anonymous',
      os: submission.includeDiagnostics ? submission.diagnostics.platform : 'Omitted',
      platform: submission.includeDiagnostics ? submission.diagnostics.platform : 'Omitted',
      version: submission.includeDiagnostics ? submission.diagnostics.appVersion : 'Omitted',
      runtime: submission.includeDiagnostics
        ? submission.diagnostics.isDesktop
          ? 'Tauri Desktop'
          : 'Web Browser'
        : 'Omitted',
      screen: submission.includeDiagnostics ? submission.diagnostics.screenResolution : 'Omitted',
      locale: submission.includeDiagnostics ? submission.diagnostics.language : 'Omitted',
      timestamp: new Date().toISOString(),
    };

    await fetch(FEEDBACK_WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return { success: true };
  } catch (err: unknown) {
    console.error('Failed to submit feedback:', err);
    const message = err instanceof Error ? err.message : 'Unable to connect to the feedback endpoint. Please check your internet connection.';
    return {
      success: false,
      error: message,
    };
  }
}
