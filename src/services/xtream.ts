import type {
  Category,
  LiveStream,
  MovieItem,
  SeriesItem,
  SeriesInfoResponse,
  XtreamAuthResponse,
  XtreamCredentials,
} from '../types/iptv';

export const DEFAULT_CREDENTIALS: XtreamCredentials = {
  serverUrl: 'http://1dhn1.xyz:80',
  username: 'f5CZ0Qa6',
  password: 'oFZUHZNe',
};

/**
 * Returns appropriate base URL:
 * In Vite dev mode on localhost, routes through the Vite proxy `/api/xtream` to avoid browser CORS issues.
 * On real Smart TVs (webOS/Tizen) or mobile WebViews, uses the actual direct server URL.
 */
export function getApiBaseUrl(serverUrl: string): string {
  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return '/api/xtream';
  }
  return serverUrl.replace(/\/+$/, '');
}

/**
 * Generates the stream URL for live streams.
 */
export function getLiveStreamUrl(
  creds: XtreamCredentials,
  streamId: number | string,
  extension: 'm3u8' | 'ts' = 'm3u8'
): string {
  const base = getApiBaseUrl(creds.serverUrl);
  return `${base}/live/${creds.username}/${creds.password}/${streamId}.${extension}`;
}

/**
 * Generates the stream URL for movies (VOD).
 */
export function getMovieStreamUrl(
  creds: XtreamCredentials,
  streamId: number | string,
  extension: string = 'mp4'
): string {
  const base = getApiBaseUrl(creds.serverUrl);
  const ext = extension.replace(/^\./, '') || 'mp4';
  return `${base}/movie/${creds.username}/${creds.password}/${streamId}.${ext}`;
}

/**
 * Generates the stream URL for series episodes.
 */
export function getSeriesStreamUrl(
  creds: XtreamCredentials,
  episodeId: number | string,
  extension: string = 'mp4'
): string {
  const base = getApiBaseUrl(creds.serverUrl);
  const ext = extension.replace(/^\./, '') || 'mp4';
  return `${base}/series/${creds.username}/${creds.password}/${episodeId}.${ext}`;
}

export async function authenticateXtream(
  creds: XtreamCredentials
): Promise<XtreamAuthResponse> {
  const base = getApiBaseUrl(creds.serverUrl);
  const url = `${base}/player_api.php?username=${encodeURIComponent(
    creds.username
  )}&password=${encodeURIComponent(creds.password)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Kimlik doğrulama başarısız: HTTP ${res.status}`);
  }

  const data: XtreamAuthResponse = await res.json();
  if (!data.user_info || data.user_info.auth !== 1) {
    throw new Error('Geçersiz kullanıcı adı veya şifre.');
  }

  return data;
}

/* ==================== LIVE TV ==================== */

export async function getLiveCategories(
  creds: XtreamCredentials
): Promise<Category[]> {
  const base = getApiBaseUrl(creds.serverUrl);
  const url = `${base}/player_api.php?username=${encodeURIComponent(
    creds.username
  )}&password=${encodeURIComponent(creds.password)}&action=get_live_categories`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Canlı TV kategorileri alınamadı: HTTP ${res.status}`);
  const data: Category[] = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getLiveStreams(
  creds: XtreamCredentials,
  categoryId?: string
): Promise<LiveStream[]> {
  const base = getApiBaseUrl(creds.serverUrl);
  let url = `${base}/player_api.php?username=${encodeURIComponent(
    creds.username
  )}&password=${encodeURIComponent(creds.password)}&action=get_live_streams`;

  if (categoryId && categoryId !== 'all') {
    url += `&category_id=${encodeURIComponent(categoryId)}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Canlı yayınlar alınamadı: HTTP ${res.status}`);
  const data: LiveStream[] = await res.json();
  return Array.isArray(data) ? data : [];
}

/* ==================== MOVIES (VOD) ==================== */

export async function getVodCategories(
  creds: XtreamCredentials
): Promise<Category[]> {
  const base = getApiBaseUrl(creds.serverUrl);
  const url = `${base}/player_api.php?username=${encodeURIComponent(
    creds.username
  )}&password=${encodeURIComponent(creds.password)}&action=get_vod_categories`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Film kategorileri alınamadı: HTTP ${res.status}`);
  const data: Category[] = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getVodStreams(
  creds: XtreamCredentials,
  categoryId?: string
): Promise<MovieItem[]> {
  const base = getApiBaseUrl(creds.serverUrl);
  let url = `${base}/player_api.php?username=${encodeURIComponent(
    creds.username
  )}&password=${encodeURIComponent(creds.password)}&action=get_vod_streams`;

  if (categoryId && categoryId !== 'all') {
    url += `&category_id=${encodeURIComponent(categoryId)}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Filmler alınamadı: HTTP ${res.status}`);
  const data: MovieItem[] = await res.json();
  return Array.isArray(data) ? data : [];
}

/* ==================== SERIES ==================== */

export async function getSeriesCategories(
  creds: XtreamCredentials
): Promise<Category[]> {
  const base = getApiBaseUrl(creds.serverUrl);
  const url = `${base}/player_api.php?username=${encodeURIComponent(
    creds.username
  )}&password=${encodeURIComponent(creds.password)}&action=get_series_categories`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Dizi kategorileri alınamadı: HTTP ${res.status}`);
  const data: Category[] = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getSeriesList(
  creds: XtreamCredentials,
  categoryId?: string
): Promise<SeriesItem[]> {
  const base = getApiBaseUrl(creds.serverUrl);
  let url = `${base}/player_api.php?username=${encodeURIComponent(
    creds.username
  )}&password=${encodeURIComponent(creds.password)}&action=get_series`;

  if (categoryId && categoryId !== 'all') {
    url += `&category_id=${encodeURIComponent(categoryId)}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Diziler alınamadı: HTTP ${res.status}`);
  const data: SeriesItem[] = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getSeriesInfo(
  creds: XtreamCredentials,
  seriesId: number | string
): Promise<SeriesInfoResponse> {
  const base = getApiBaseUrl(creds.serverUrl);
  const url = `${base}/player_api.php?username=${encodeURIComponent(
    creds.username
  )}&password=${encodeURIComponent(creds.password)}&action=get_series_info&series_id=${encodeURIComponent(
    seriesId
  )}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Dizi detayları alınamadı: HTTP ${res.status}`);
  const data: SeriesInfoResponse = await res.json();
  return data;
}
