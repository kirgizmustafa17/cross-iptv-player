import type { XtreamCredentials } from '../types/iptv';
import { getOrCreateDeviceInfo, getBackendUrl, type StoredPlaylist } from './device';
import { saveCredentials, getStoredCredentials } from './storage';

export interface DeviceDataResponse {
  deviceId: string;
  hasPin: boolean;
  lastSeen: string;
  playlists: StoredPlaylist[];
  activePlaylist: StoredPlaylist | null;
}

/**
 * Normalizes backend URL for browser or webOS/Android TV
 */
function getApiEndpoint(path: string): string {
  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    // Route via Vite proxy in development
    return path;
  }
  const base = getBackendUrl().replace(/\/+$/, '');
  return `${base}${path}`;
}

/**
 * Pings backend to register/keep-alive device and returns device data.
 * Falls back to local storage if backend is unreachable.
 */
export async function syncDeviceWithBackend(): Promise<{
  deviceInfo: { deviceId: string; pin: string };
  playlists: StoredPlaylist[];
  activePlaylist: StoredPlaylist | null;
  synced: boolean;
}> {
  const info = getOrCreateDeviceInfo();

  try {
    const url = getApiEndpoint('/api/device/register');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: info.deviceId, pin: info.pin }),
    });

    if (res.ok) {
      const data = await res.json();
      const dev = data.device;
      const playlists: StoredPlaylist[] = dev.playlists || [];
      const active = playlists.find((p) => p.isActive) || playlists[0] || null;

      // If active playlist is Xtream, sync credentials to local storage
      if (active && active.type === 'xtream' && active.serverUrl && active.username && active.password) {
        const creds: XtreamCredentials = {
          serverUrl: active.serverUrl,
          username: active.username,
          password: active.password,
        };
        saveCredentials(creds);
      }

      return {
        deviceInfo: info,
        playlists,
        activePlaylist: active,
        synced: true,
      };
    }
  } catch (err) {
    console.warn('Backend sync failed, operating in offline/local mode:', err);
  }

  // Fallback to local
  const localCreds = getStoredCredentials();
  const fallbackActive: StoredPlaylist = {
    id: 'local-default',
    name: 'Yerel Liste',
    type: 'xtream',
    serverUrl: localCreds.serverUrl,
    username: localCreds.username,
    password: localCreds.password,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    deviceInfo: info,
    playlists: [fallbackActive],
    activePlaylist: fallbackActive,
    synced: false,
  };
}

/**
 * Fetches all playlists for this device from backend
 */
export async function fetchPlaylists(deviceId: string): Promise<StoredPlaylist[]> {
  try {
    const url = getApiEndpoint(`/api/device/${encodeURIComponent(deviceId)}/playlists`);
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch playlists:', err);
  }
  return [];
}

/**
 * Activates a playlist on the backend
 */
export async function activatePlaylist(deviceId: string, playlistId: string): Promise<StoredPlaylist | null> {
  try {
    const url = getApiEndpoint(`/api/device/${encodeURIComponent(deviceId)}/playlists/${playlistId}/activate`);
    const res = await fetch(url, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      const active = data.activePlaylist;
      if (active && active.type === 'xtream' && active.serverUrl && active.username && active.password) {
        saveCredentials({
          serverUrl: active.serverUrl,
          username: active.username,
          password: active.password,
        });
      }
      return active;
    }
  } catch (err) {
    console.error('Failed to activate playlist on server:', err);
  }
  return null;
}
