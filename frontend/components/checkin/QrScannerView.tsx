'use client';

import type { RefObject } from 'react';
import { Camera, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import type { ScanStatus } from '@/hooks/useQrScanner';

interface QrScannerViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  scanning: boolean;
  qrDetected: boolean;
  scanStatus: ScanStatus;
  isFullscreen: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  loading: boolean;
  onClose: () => void;
}

export function QrScannerView({
  videoRef,
  canvasRef,
  scanning,
  qrDetected,
  scanStatus,
  isFullscreen,
  message,
  loading,
  onClose,
}: QrScannerViewProps) {
  const { t } = useTranslation();

  return (
    <div className={`${isFullscreen ? 'flex-1 flex flex-col' : 'space-y-4'}`}>
      {/* 等待相机启动的占位 */}
      {!scanning && (
        <div className="text-center py-8">
          <Camera className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">
            {t('checkin.dialog.startCameraHint')}
          </p>
        </div>
      )}

      {/* video/canvas 始终挂载，保证 ref 可用；未启动时用 opacity-0 隐藏（hidden 会导致视频不加载） */}
      <div className={`${scanning ? (isFullscreen ? 'flex-1 flex flex-col gap-3' : 'space-y-4') : 'opacity-0 absolute pointer-events-none'}`}>
        <div className={`relative bg-black rounded-lg overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'flex-1 min-h-0' : 'aspect-video'
        } ${
          qrDetected ? 'ring-4 ring-green-500' : ''
        }`}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* 扫描框 - 响应式尺寸 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 border-2 border-white/50 rounded-lg">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

              {scanStatus === 'scanning' && !qrDetected && (
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                </div>
              )}

              {qrDetected && (
                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-16 h-16 text-green-500 animate-scale-in" />
                </div>
              )}
            </div>
          </div>

          {/* 状态提示 */}
          <div className="absolute top-3 left-3 right-3">
            <div className={`inline-flex px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              scanStatus === 'scanning' ? 'bg-blue-500/80 text-white' :
              scanStatus === 'detected' ? 'bg-green-500/80 text-white' :
              scanStatus === 'processing' ? 'bg-yellow-500/80 text-white' :
              'bg-gray-500/80 text-white'
            }`}>
              {scanStatus === 'scanning' && t('checkin.dialog.scanning')}
              {scanStatus === 'detected' && t('checkin.dialog.qrDetected')}
              {scanStatus === 'processing' && t('checkin.dialog.processing')}
            </div>
          </div>

          {/* 签到结果浮层 */}
          {message && (
            <div className="absolute bottom-3 left-3 right-3">
              <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-green-500/90 text-white'
                  : 'bg-red-500/90 text-white'
              }`}>
                {message.text}
              </div>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center shrink-0">
          {t('checkin.dialog.alignQrCode')}
        </p>

        <button
          onClick={onClose}
          disabled={loading}
          className="w-full px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 shrink-0 font-medium"
        >
          {t('checkin.dialog.closeDialog')}
        </button>
      </div>
    </div>
  );
}
