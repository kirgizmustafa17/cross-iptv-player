import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;
const DATA_FILE = path.join(__dirname, 'data', 'devices.json');
const INDEX_FILE = path.join(__dirname, 'public', 'index.html');

// Process safety guards
process.on('uncaughtException', (err) => {
  console.error('❌ Kritik Hata (uncaughtException):', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ İşlenmeyen Promise Reddi (unhandledRejection):', reason);
});

// Middleware
app.use(cors());
app.use(express.json());
// Allow dotfiles because parent directory contains '.gemini'
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'allow' }));

// Helper to ensure data file exists
function readDb() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initialData = {
        devices: {
          'mavi-kartal-7421': {
            deviceId: 'mavi-kartal-7421',
            pin: '1234',
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            playlists: [
              {
                id: 'pl-default-1',
                name: 'Default Xtream',
                type: 'xtream',
                serverUrl: 'http://1dhn1.xyz:80',
                username: 'f5CZ0Qa6',
                password: 'oFZUHZNe',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        },
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content || '{"devices":{}}');
  } catch (err) {
    console.error('Error reading db:', err);
    return { devices: {} };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing db:', err);
    return false;
  }
}

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Cross IPTV Device & Playlist Manager',
    time: new Date().toISOString(),
  });
});

// Register or Heartbeat Device
app.post('/api/device/register', (req, res) => {
  try {
    const { deviceId, pin } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const db = readDb();
    let device = db.devices[deviceId];

    if (!device) {
      // Register new device
      device = {
        deviceId,
        pin: pin || '1234',
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        playlists: [
          {
            id: 'pl-default-' + Date.now(),
            name: 'Varsayılan Liste',
            type: 'xtream',
            serverUrl: 'http://1dhn1.xyz:80',
            username: 'f5CZ0Qa6',
            password: 'oFZUHZNe',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };
      db.devices[deviceId] = device;
      writeDb(db);
      return res.json({ message: 'Device registered successfully', device });
    }

    // Update lastSeen
    device.lastSeen = new Date().toISOString();
    if (pin && !device.pin) {
      device.pin = pin;
    }
    writeDb(db);

    return res.json({ message: 'Device active', device });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Cihaz kaydı sırasında hata oluştu' });
  }
});

// Verify PIN
app.post('/api/device/:deviceId/verify', (req, res) => {
  try {
    const { deviceId } = req.params;
    const { pin } = req.body;

    const db = readDb();
    const device = db.devices[deviceId];

    if (!device) {
      return res.status(404).json({ error: 'Cihaz bulunamadı (Device not found)' });
    }

    if (device.pin && device.pin !== pin) {
      return res.status(401).json({ error: 'Geçersiz Güvenlik PIN kodu (Invalid PIN)' });
    }

    return res.json({ success: true, device });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get Device Info & Playlists
app.get('/api/device/:deviceId', (req, res) => {
  try {
    const { deviceId } = req.params;
    const { pin } = req.query;

    const db = readDb();
    const device = db.devices[deviceId];

    if (!device) {
      return res.status(404).json({ error: 'Cihaz bulunamadı (Device not found)' });
    }

    // Check pin if device has pin and pin is provided or required
    if (device.pin && pin && device.pin !== pin) {
      return res.status(401).json({ error: 'Yetkisiz erişim: PIN hatalı' });
    }

    res.json({
      deviceId: device.deviceId,
      hasPin: !!device.pin,
      lastSeen: device.lastSeen,
      playlists: device.playlists || [],
      activePlaylist: (device.playlists || []).find((p) => p.isActive) || device.playlists?.[0] || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get All Playlists for a Device
app.get('/api/device/:deviceId/playlists', (req, res) => {
  try {
    const { deviceId } = req.params;
    const db = readDb();
    const device = db.devices[deviceId];

    if (!device) {
      return res.status(404).json({ error: 'Cihaz bulunamadı' });
    }

    res.json(device.playlists || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Add New Playlist to Device
app.post('/api/device/:deviceId/playlists', (req, res) => {
  try {
    const { deviceId } = req.params;
    const { name, type, serverUrl, username, password, m3uUrl, epgUrl, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Liste adı (name) zorunludur' });
    }

    const db = readDb();
    let device = db.devices[deviceId];

    if (!device) {
      // Auto-create device if not exists
      device = {
        deviceId,
        pin: req.body.pin || '1234',
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        playlists: [],
      };
      db.devices[deviceId] = device;
    }

    if (!device.playlists) {
      device.playlists = [];
    }

    const shouldBeActive = isActive !== undefined ? isActive : device.playlists.length === 0;

    if (shouldBeActive) {
      device.playlists.forEach((p) => (p.isActive = false));
    }

    const newPlaylist = {
      id: 'pl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      type: type === 'm3u' ? 'm3u' : 'xtream',
      serverUrl: serverUrl ? serverUrl.trim() : undefined,
      username: username ? username.trim() : undefined,
      password: password ? password.trim() : undefined,
      m3uUrl: m3uUrl ? m3uUrl.trim() : undefined,
      epgUrl: epgUrl ? epgUrl.trim() : undefined,
      isActive: shouldBeActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    device.playlists.push(newPlaylist);
    writeDb(db);

    res.status(201).json({ message: 'Playlist eklendi', playlist: newPlaylist });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Update Playlist
app.put('/api/device/:deviceId/playlists/:playlistId', (req, res) => {
  try {
    const { deviceId, playlistId } = req.params;
    const { name, type, serverUrl, username, password, m3uUrl, epgUrl, isActive } = req.body;

    const db = readDb();
    const device = db.devices[deviceId];

    if (!device || !device.playlists) {
      return res.status(404).json({ error: 'Cihaz veya oynatma listesi bulunamadı' });
    }

    const playlist = device.playlists.find((p) => p.id === playlistId);
    if (!playlist) {
      return res.status(404).json({ error: 'Oynatma listesi bulunamadı' });
    }

    if (isActive === true) {
      device.playlists.forEach((p) => (p.isActive = false));
      playlist.isActive = true;
    } else if (isActive === false) {
      playlist.isActive = false;
    }

    if (name !== undefined) playlist.name = name.trim();
    if (type !== undefined) playlist.type = type;
    if (serverUrl !== undefined) playlist.serverUrl = serverUrl.trim();
    if (username !== undefined) playlist.username = username.trim();
    if (password !== undefined) playlist.password = password.trim();
    if (m3uUrl !== undefined) playlist.m3uUrl = m3uUrl.trim();
    if (epgUrl !== undefined) playlist.epgUrl = epgUrl.trim();
    playlist.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({ message: 'Playlist güncellendi', playlist });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete Playlist
app.delete('/api/device/:deviceId/playlists/:playlistId', (req, res) => {
  try {
    const { deviceId, playlistId } = req.params;

    const db = readDb();
    const device = db.devices[deviceId];

    if (!device || !device.playlists) {
      return res.status(404).json({ error: 'Cihaz veya oynatma listesi bulunamadı' });
    }

    const initialLength = device.playlists.length;
    const wasActive = device.playlists.find((p) => p.id === playlistId)?.isActive;

    device.playlists = device.playlists.filter((p) => p.id !== playlistId);

    if (device.playlists.length === initialLength) {
      return res.status(404).json({ error: 'Oynatma listesi bulunamadı' });
    }

    // If deleted playlist was active and others exist, make the first one active
    if (wasActive && device.playlists.length > 0) {
      device.playlists[0].isActive = true;
    }

    writeDb(db);
    res.json({ message: 'Playlist silindi', remainingCount: device.playlists.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Set Active Playlist
app.post('/api/device/:deviceId/playlists/:playlistId/activate', (req, res) => {
  try {
    const { deviceId, playlistId } = req.params;

    const db = readDb();
    const device = db.devices[deviceId];

    if (!device || !device.playlists) {
      return res.status(404).json({ error: 'Cihaz veya oynatma listesi bulunamadı' });
    }

    const target = device.playlists.find((p) => p.id === playlistId);
    if (!target) {
      return res.status(404).json({ error: 'Oynatma listesi bulunamadı' });
    }

    device.playlists.forEach((p) => {
      p.isActive = p.id === playlistId;
    });

    writeDb(db);
    res.json({ message: 'Aktif playlist değiştirildi', activePlaylist: target });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Test Xtream Codes Credentials via Backend Proxy
app.post('/api/test/xtream', async (req, res) => {
  const { serverUrl, username, password } = req.body;

  if (!serverUrl || !username || !password) {
    return res.status(400).json({ error: 'Sunucu URL, Kullanıcı Adı ve Şifre zorunludur' });
  }

  const cleanUrl = serverUrl.replace(/\/+$/, '');
  const authUrl = `${cleanUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(authUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CrossIPTV/1.0',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Sunucu hatası: HTTP ${response.status}`,
      });
    }

    const data = await response.json();
    if (data.user_info && data.user_info.auth === 1) {
      return res.json({
        success: true,
        message: 'Bağlantı Başarılı!',
        userInfo: data.user_info,
        serverInfo: data.server_info,
      });
    } else {
      return res.status(401).json({
        success: false,
        error: 'Geçersiz Kullanıcı Adı veya Şifre (Giriş Başarısız)',
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Sunucuya bağlanılamadı: ' + (err.message || 'Zaman aşımı'),
    });
  }
});

// Test M3U URL via Backend Proxy
app.post('/api/test/m3u', async (req, res) => {
  const { m3uUrl } = req.body;

  if (!m3uUrl) {
    return res.status(400).json({ error: 'M3U URL zorunludur' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(m3uUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CrossIPTV/1.0' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `M3U Bağlantı Hatası: HTTP ${response.status}`,
      });
    }

    const text = await response.text();
    const isM3u = text.includes('#EXTM3U') || text.includes('#EXTINF:');
    const channelMatches = text.match(/#EXTINF:/g);
    const count = channelMatches ? channelMatches.length : 0;

    return res.json({
      success: true,
      isM3u,
      estimatedChannels: count,
      message: `Bağlantı Başarılı! Yaklaşık ${count} kanal algılandı.`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'M3U URL test edilemedi: ' + (err.message || 'Zaman aşımı'),
    });
  }
});

// Catch-all route to serve the Web Portal
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint bulunamadı' });
  }

  try {
    if (fs.existsSync(INDEX_FILE)) {
      const html = fs.readFileSync(INDEX_FILE, 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }
    return res.status(404).send('Web Portal index.html bulunamadı');
  } catch (err) {
    next(err);
  }
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('❌ Sunucu Hatası:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Sunucu içi hata oluştu',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Cross IPTV Backend & Web Portal running on:`);
  console.log(`   - Local:    http://localhost:${PORT}`);
  console.log(`   - API:      http://localhost:${PORT}/api/health`);
  console.log(`   - Data:     ${DATA_FILE}`);
  console.log(`====================================================`);
});
