import type { XtreamCredentials } from '../types/iptv';
import { DEFAULT_CREDENTIALS } from './xtream';

const STORAGE_KEYS = {
  CREDS: 'cross_iptv_creds',
  FAVORITES: 'cross_iptv_favorites',
  LAST_CHANNEL: 'cross_iptv_last_channel',
};

export function getStoredCredentials(): XtreamCredentials {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CREDS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Credentials retrieval failed', e);
  }
  return DEFAULT_CREDENTIALS;
}

export function saveCredentials(creds: XtreamCredentials): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CREDS, JSON.stringify(creds));
  } catch (e) {
    console.error('Credentials saving failed', e);
  }
}

export function getFavorites(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Favorites retrieval failed', e);
  }
  return [];
}

export function toggleFavorite(streamId: number): number[] {
  const current = getFavorites();
  const exists = current.includes(streamId);
  const updated = exists
    ? current.filter((id) => id !== streamId)
    : [...current, streamId];
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
  } catch (e) {
    console.error('Favorites saving failed', e);
  }
  return updated;
}
