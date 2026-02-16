'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, QrCode, Keyboard, Camera, CheckCircle } from 'lucide-react';
import { checkInByCode, type CheckinErrorCode } from '@/lib/api/checkin';
import { useTranslation } from '@/lib/i18n/context';
import { toast } from 'sonner';
import jsQR from 'jsqr';

interface CheckinDialogProps {
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type TabType = 'scan' | 'manual';

export function CheckinDialog({ eventId, onClose, onSuccess }: CheckinDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('scan');
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [qrDetected, setQrDetected] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'detected' | 'processing'>('idle');
  const [checkinCount, setCheckinCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  // 清理摄像头
  const cleanupCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setQrDetected(false);
    setScanStatus('idle');
    processingRef.current = false;
  }, []);

  useEffect(() => {
    return cleanupCamera;
  }, [cleanupCamera]);

  // 扫描二维码
  const scanQRCode = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || processingRef.current) return;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      setQrDetected(true);
      setScanStatus('detected');
      processingRef.current = true;
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }

      setTimeout(() => {
        setScanStatus('processing');
        handleCheckin(code.data);
      }, 300);
    } else {
      setQrDetected(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // 启动摄像头
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);
        setScanStatus('scanning');

        videoRef.current.onloadedmetadata = () => {
          scanIntervalRef.current = setInterval(() => {
            scanQRCode();
          }, 100);
        };
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
      setMessage({ type: 'error', text: t('checkin.dialog.cameraError') });
    }
  }, [scanQRCode, t]);

  // 打开时自动启动相机
  useEffect(() => {
    if (activeTab === 'scan' && !scanning && scanStatus === 'idle') {
      startCamera();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 重置扫描状态（连续扫描）
  const resumeScanning = useCallback(() => {
    setMessage(null);
    setQrDetected(false);
    setScanStatus('scanning');
    processingRef.current = false;

    if (videoRef.current && streamRef.current && !scanIntervalRef.current) {
      scanIntervalRef.current = setInterval(() => {
        scanQRCode();
      }, 100);
    }
  }, [scanQRCode]);

  // 错误码 → i18n key 映射
  const getErrorMessage = (errorCode?: CheckinErrorCode): string => {
    const map: Record<CheckinErrorCode, string> = {
      EVENT_NOT_FOUND: t('checkin.dialog.errors.eventNotFound'),
      INVALID_CODE: t('checkin.dialog.errors.invalidCode'),
      INVALID_CODE_FORMAT: t('checkin.dialog.errors.invalidCodeFormat'),
      WRONG_EVENT: t('checkin.dialog.errors.wrongEvent'),
      NOT_SIGNED_UP: t('checkin.dialog.errors.notSignedUp'),
      ALREADY_CHECKED_IN: t('checkin.dialog.errors.alreadyCheckedIn'),
      SIGNUP_FETCH_FAILED: t('checkin.dialog.errors.fetchFailed'),
      CHECKIN_FAILED: t('checkin.dialog.checkinError'),
    };
    return errorCode ? map[errorCode] : t('checkin.dialog.checkinError');
  };

  // 处理签到
  const handleCheckin = async (code: string) => {
    if (!code.trim()) {
      setMessage({ type: 'error', text: t('checkin.dialog.enterCodeError') });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await checkInByCode(eventId, code);

      if (result.success) {
        const userName = result.userName || t('checkin.dialog.defaultUser');
        setCheckinCount(prev => prev + 1);
        onSuccess();
        setMessage({
          type: 'success',
          text: t('checkin.dialog.checkinSuccess', { userName })
        });
        toast.success(t('checkin.dialog.checkinSuccess', { userName }));
        setManualCode('');

        // 扫描模式下 2 秒后自动恢复扫描
        if (activeTab === 'scan') {
          setTimeout(() => {
            resumeScanning();
          }, 2000);
        }
      } else {
        const errorText = getErrorMessage(result.errorCode);
        // "已签到"属于提示类信息，用 warning 风格但仍走 error 通道
        setMessage({ type: 'error', text: errorText });
        // 错误时也恢复扫描
        if (activeTab === 'scan') {
          setTimeout(() => {
            resumeScanning();
          }, 2000);
        }
      }
    } catch {
      setMessage({ type: 'error', text: t('checkin.dialog.checkinError') });
      if (activeTab === 'scan') {
        setTimeout(() => {
          resumeScanning();
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCheckin(manualCode);
  };

  const handleClose = () => {
    cleanupCamera();
    onClose();
  };

  // 手机上扫描模式时全屏显示
  const isFullscreen = activeTab === 'scan' && scanning;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4">
      <div className={`bg-card border border-border shadow-xl w-full overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'h-full md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-xl'
          : 'h-full md:h-auto md:max-h-[90vh] max-w-lg md:rounded-xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-xl font-semibold text-foreground">{t('checkin.dialog.title')}</h2>
            {checkinCount > 0 && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                {checkinCount}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => {
              setActiveTab('manual');
              cleanupCamera();
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 font-medium transition-colors ${
              activeTab === 'manual'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Keyboard className="w-5 h-5" />
            {t('checkin.dialog.manualTab')}
          </button>
          <button
            onClick={() => {
              setActiveTab('scan');
              setMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 font-medium transition-colors ${
              activeTab === 'scan'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <QrCode className="w-5 h-5" />
            {t('checkin.dialog.scanTab')}
          </button>
        </div>

        {/* Content */}
        <div className={`${isFullscreen ? 'flex-1 flex flex-col p-3 md:p-6' : 'p-4 md:p-6'}`}>
          {activeTab === 'manual' ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('checkin.dialog.codeLabel')}
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualCode(val);
                    if (val.length === 6) {
                      handleCheckin(val);
                    }
                  }}
                  maxLength={6}
                  placeholder={t('checkin.dialog.codePlaceholder')}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                  autoFocus
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('checkin.dialog.codeHint')}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? t('checkin.dialog.processing') : t('checkin.dialog.confirmButton')}
              </button>
            </form>
          ) : (
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

              {/* video/canvas 始终挂载，保证 ref 可用；未启动时隐藏 */}
              <div className={`${scanning ? (isFullscreen ? 'flex-1 flex flex-col gap-3' : 'space-y-4') : 'hidden'}`}>
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
                      {/* 四角标记 */}
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>

                      {/* 扫描线动画 */}
                      {scanStatus === 'scanning' && !qrDetected && (
                        <div className="absolute inset-0 overflow-hidden">
                          <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line"></div>
                        </div>
                      )}

                      {/* 检测到QR码的提示 */}
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
                  onClick={handleClose}
                  disabled={loading}
                  className="w-full px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 shrink-0 font-medium"
                >
                  {t('checkin.dialog.closeDialog')}
                </button>
              </div>
            </div>
          )}

          {/* Message - 仅在非扫描模式下显示在底部 */}
          {message && activeTab !== 'scan' && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
