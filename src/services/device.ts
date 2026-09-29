// Device ID & Security PIN generation and local persistence

const ADJECTIVES = [
  'mavi', 'kara', 'kizil', 'altin', 'gumus', 'yesil', 'beyaz', 'parlak',
  'hizli', 'cesur', 'guclu', 'seri', 'akilli', 'derin', 'atesli', 'engin',
  'yuce', 'soylu', 'keskin', 'yildizli', 'alfa', 'safir', 'zumrut', 'yakut'
];

const NOUNS = [
  'kartal', 'aslan', 'kaplan', 'sahin', 'kurt', 'pars', 'panter', 'yildiz',
  'ruzgar', 'dalga', 'samuray', 'anka', 'bulut', 'simsek', 'meteor', 'gezegen',
  'volkan', 'ejder', 'bozkurt', 'dogus', 'titan', 'kartal', 'baykus', 'gezen'
];

export interface DeviceInfo {
  deviceId: string;
  pin: string;
}

export interface StoredPlaylist {
  id: string;
  name: string;
  type: 'xtream' | 'm3u';
  serverUrl?: string;
  username?: string;
  password?: string;
  m3uUrl?: string;
  epgUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEYS = {
  DEVICE_ID: 'cross_iptv_device_id',
  DEVICE_PIN: 'cross_iptv_device_pin',
  PLAYLISTS: 'cross_iptv_playlists',
  BACKEND_URL: 'cross_iptv_backend_url',
};

/**
 * Generates a human-readable slug Device ID like "mavi-kartal-7421"
 */
export function generateReadableDeviceId(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${noun}-${num}`;
}

/**
 * Generates a 4-digit device PIN
 */
export function generateDevicePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Gets or creates the persistent Device ID and PIN for this TV/device
 */
export function getOrCreateDeviceInfo(): DeviceInfo {
  try {
    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    let pin = localStorage.getItem(STORAGE_KEYS.DEVICE_PIN);

    if (!deviceId) {
      deviceId = generateReadableDeviceId();
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    if (!pin) {
      pin = generateDevicePin();
      localStorage.setItem(STORAGE_KEYS.DEVICE_PIN, pin);
    }

    return { deviceId, pin };
  } catch (e) {
    console.warn('Storage unavailable, using fallback device info', e);
    return {
      deviceId: 'mavi-kartal-7421',
      pin: '1234',
    };
  }
}

/**
 * Default backend URL for syncing playlists.
 * In development, points to window.location.origin or localhost:5050.
 */
export function getBackendUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.BACKEND_URL);
    if (saved) return saved;
  } catch {}

  if (typeof window !== 'undefined') {
    // If running in browser or webOS on standard dev/preview
    const host = window.location.hostname;
    // By default connect to backend on port 5050
    return `http://${host}:5050`;
  }
  return 'http://localhost:5050';
}

export function setBackendUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BACKEND_URL, url);
  } catch (e) {
    console.error('Failed to save backend URL', e);
  }
}
