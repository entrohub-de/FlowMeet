'use client';

import { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { Calendar, MapPin, Download, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { formatDateRange, formatPrice, isEventFree } from '@/lib/utils';
import type { Event } from '@/types/domain';

interface EventPosterProps {
  event: Event;
  onClose: () => void;
}

const isMobile = () =>
  typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export default function EventPoster({ event, onClose }: EventPosterProps) {
  const { t, locale } = useTranslation();
  const posterRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [whiteLogo, setWhiteLogo] = useState<string>('');
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const eventUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/events/${event.event_id}`
    : '';

  // Pre-render logo as white using canvas (html2canvas doesn't support CSS filter)
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
          data[i] = 255;     // R
          data[i + 1] = 255; // G
          data[i + 2] = 255; // B
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setWhiteLogo(canvas.toDataURL('image/png'));
    };
    img.src = '/images/entrohub-full-logo.png';
  }, []);

  async function handleDownload() {
    if (!posterRef.current || downloading) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');

      if (isMobile()) {
        setPreviewSrc(dataUrl);
      } else {
        const link = document.createElement('a');
        link.download = `${event.name}-poster.png`;
        link.href = dataUrl;
        link.click();
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex flex-col items-center gap-4 max-h-[90vh] overflow-y-auto">
        {previewSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt={event.name}
              className="rounded-2xl shadow-lg"
              style={{ width: 375 }}
            />
            <p className="text-white/80 text-sm">{t('poster.longPressToSave')}</p>
            <button
              type="button"
              onClick={() => setPreviewSrc(null)}
              className="flex items-center gap-2 px-6 py-2.5 bg-white text-foreground border border-border rounded-xl font-medium text-sm hover:bg-muted transition-colors"
            >
              <X size={16} />
              {t('common.back')}
            </button>
          </>
        ) : (
          <>
            {/* Poster content - captured as image */}
            <div
              ref={posterRef}
              style={{
                width: 375,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                backgroundColor: '#ffffff',
              }}
              className="rounded-2xl overflow-hidden shadow-lg"
            >
              {/* Header with Entrohub logo */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #5272F7 0%, #7B93FA 100%)',
                  padding: '24px 24px 20px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {whiteLogo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={whiteLogo}
                    alt="Entrohub"
                    style={{ height: 40 }}
                  />
                )}
              </div>

              {/* Event info */}
              <div style={{ padding: '24px' }}>
                <h2 style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#10100E',
                  lineHeight: 1.3,
                  margin: '0 0 12px 0',
                }}>
                  {event.name}
                </h2>

                {event.description && (
                  <p style={{
                    fontSize: 14,
                    color: '#6b7280',
                    lineHeight: 1.6,
                    margin: '0 0 20px 0',
                  }}>
                    {event.description}
                  </p>
                )}

                {/* Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Calendar size={16} color="#5272F7" />
                  <span style={{ fontSize: 14, color: '#374151' }}>
                    {formatDateRange(event.start_time, event.end_time, locale)}
                  </span>
                </div>

                {/* Location */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <MapPin size={16} color="#5272F7" />
                  <span style={{ fontSize: 14, color: '#374151' }}>
                    {event.venue?.name || 'TBD'}
                  </span>
                </div>

                {/* Price */}
                {!isEventFree(event) && event.price_cents && event.currency && (
                  <div style={{
                    display: 'inline-block',
                    marginTop: 4,
                    marginBottom: 8,
                    padding: '4px 12px',
                    backgroundColor: '#EBF25C',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#10100E',
                  }}>
                    {formatPrice(event.price_cents, event.currency)}
                  </div>
                )}

                {/* QR Code */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: '1px solid #f3f4f6',
                }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: 12,
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                  }}>
                    <QRCodeSVG value={eventUrl} size={160} />
                  </div>
                  <span style={{
                    fontSize: 12,
                    color: '#9ca3af',
                    marginTop: 12,
                  }}>
                    {t('poster.scanToView')}
                  </span>
                </div>

                {/* Footer branding */}
                <div style={{
                  textAlign: 'center',
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: '1px solid #f3f4f6',
                }}>
                  <span style={{ fontSize: 11, color: '#d1d5db', fontWeight: 500, letterSpacing: 0.5 }}>
                    app.entrohub.io
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons - outside poster capture area */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <Download size={16} />
                {downloading ? t('poster.downloading') : t('poster.download')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-foreground border border-border rounded-xl font-medium text-sm hover:bg-muted transition-colors"
              >
                <X size={16} />
                {t('common.close')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
