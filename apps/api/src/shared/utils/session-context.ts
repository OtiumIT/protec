import type { Context } from 'hono';

export type ClientDeviceHints = {
  timezone?: string | null;
  language?: string | null;
  screen?: string | null;
  platform?: string | null;
};

export type SessionContext = {
  ip: string | null;
  user_agent: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  metadata: Record<string, unknown>;
};

function header(c: Context, name: string): string | null {
  const v = c.req.header(name)?.trim();
  return v && v.length > 0 ? v : null;
}

function firstPublicIp(raw: string | null): string | null {
  if (!raw) return null;
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  for (const ip of parts) {
    if (
      ip.startsWith('10.') ||
      ip.startsWith('127.') ||
      ip.startsWith('192.168.') ||
      ip.startsWith('::1') ||
      ip.startsWith('fc') ||
      ip.startsWith('fd')
    ) continue;
    return ip.slice(0, 80);
  }
  return parts[0]?.slice(0, 80) ?? null;
}

function parseUserAgent(ua: string | null): { browser: string | null; os: string | null; device_type: string | null } {
  if (!ua) return { browser: null, os: null, device_type: null };
  const s = ua;

  let os: string | null = null;
  if (/iPhone|iPad|iPod/i.test(s)) os = /iPad/i.test(s) ? 'iPadOS' : 'iOS';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/Windows NT/i.test(s)) os = 'Windows';
  else if (/Mac OS X/i.test(s)) os = 'macOS';
  else if (/Linux/i.test(s)) os = 'Linux';
  else if (/CrOS/i.test(s)) os = 'ChromeOS';

  let browser: string | null = null;
  if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(s)) browser = 'Opera';
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = 'Chrome';
  else if (/Safari\//i.test(s) && !/Chrome/i.test(s)) browser = 'Safari';
  else if (/Firefox\//i.test(s)) browser = 'Firefox';
  else if (/MSIE |Trident\//i.test(s)) browser = 'IE';

  let device_type: string | null = 'desktop';
  if (/iPad|Tablet|PlayBook/i.test(s)) device_type = 'tablet';
  else if (/Mobi|iPhone|Android.+Mobile/i.test(s)) device_type = 'mobile';

  return { browser, os, device_type };
}

export function collectSessionContext(c: Context, device?: ClientDeviceHints | null): SessionContext {
  const ua = header(c, 'user-agent');
  const parsed = parseUserAgent(ua);
  const ip = firstPublicIp(
    header(c, 'cf-connecting-ip')
    || header(c, 'x-forwarded-for')
    || header(c, 'x-real-ip')
  );

  const country = header(c, 'cf-ipcountry') || header(c, 'cloudfront-viewer-country');
  const city = header(c, 'cf-ipcity') || header(c, 'x-vercel-ip-city');
  const region = header(c, 'cf-region') || header(c, 'cf-region-code') || header(c, 'cloudfront-viewer-country-region');

  const metadata: Record<string, unknown> = {};
  const acceptLang = header(c, 'accept-language');
  if (acceptLang) metadata.accept_language = acceptLang.slice(0, 120);
  const cfRay = header(c, 'cf-ray');
  if (cfRay) metadata.cf_ray = cfRay;
  const cfTimezone = header(c, 'cf-timezone');
  if (cfTimezone) metadata.cf_timezone = cfTimezone;
  if (device?.timezone) metadata.timezone = device.timezone;
  if (device?.language) metadata.language = device.language;
  if (device?.screen) metadata.screen = device.screen;
  if (device?.platform) metadata.platform = device.platform;

  return {
    ip,
    user_agent: ua ? ua.slice(0, 800) : null,
    country: country && country !== 'XX' ? country.slice(0, 80) : null,
    city: city ? decodeURIComponent(city).slice(0, 120) : null,
    region: region ? decodeURIComponent(region).slice(0, 120) : null,
    device_type: parsed.device_type,
    browser: parsed.browser,
    os: parsed.os,
    metadata,
  };
}
