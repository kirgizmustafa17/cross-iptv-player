import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Globe, Check, X, Flame } from 'lucide-react';
import { getBackendUrl } from '../services/device';

interface DevicePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  pin: string;
}

export const DevicePortalModal: React.FC<DevicePortalModalProps> = ({
  isOpen,
  onClose,
  deviceId,
  pin,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        e.key === 'Enter' ||
        e.keyCode === 10009 ||
        e.keyCode === 461
      ) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const backendBase = getBackendUrl();
  const portalUrl = `${backendBase}/?device=${encodeURIComponent(deviceId)}&pin=${encodeURIComponent(pin)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6 select-none font-sans">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl relative flex flex-col md:flex-row items-center gap-8">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* QR Code Column */}
        <div className="flex flex-col items-center justify-center p-5 bg-white rounded-3xl shadow-xl flex-shrink-0">
          <QRCodeSVG
            value={portalUrl}
            size={180}
            level="M"
            includeMargin={false}
          />
          <div className="flex items-center gap-1.5 mt-3 text-slate-950 font-bold text-xs">
            <Smartphone className="w-3.5 h-3.5 text-amber-600" />
            <span>Kamera ile Tara</span>
          </div>
        </div>

        {/* Info & Instructions Column */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Web Playlist Yükleme Portalı
              </span>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">
              Telefonunuzdan Kolayca Yönetin
            </h2>

            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Hot Player & SS IPTV deneyimi: Televizyon kumandasıyla uzun linkler yazmanıza gerek yok. Telefon veya bilgisayarınızdan listelerinizi anında yükleyin.
            </p>

            {/* Device ID and PIN Badge */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Cihaz Kimliği (Device ID):</span>
                <span className="font-mono text-base font-extrabold text-amber-400 tracking-wider">
                  {deviceId}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                <span className="text-xs text-slate-400">Güvenlik PIN:</span>
                <span className="font-mono text-sm font-bold text-slate-200">
                  {pin}
                </span>
              </div>
            </div>

            {/* Direct URL */}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 truncate">
              <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="truncate font-mono text-[11px] text-blue-300">
                {backendBase}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Anladım / Kapat (Kumandadan Geri/OK)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
