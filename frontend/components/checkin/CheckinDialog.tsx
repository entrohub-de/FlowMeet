'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, QrCode, Keyboard } from 'lucide-react';
import { checkInByCode, type CheckinErrorCode } from '@/lib/api/checkin';
import { useTranslation } from '@/lib/i18n/context';
import { toast } from 'sonner';
import { useQrScanner } from '@/hooks/useQrScanner';
import { QrScannerView } from './QrScannerView';

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
  const [checkinCount, setCheckinCount] = useState(0);

  const scanner = useQrScanner({
    onDetected: useCallback((data: string) => {
      handleCheckinFromScan(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]),
  });

  // 错误码 → i18n 映射
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

  // 核心签到逻辑
  const processCheckin = async (code: string, fromScan: boolean) => {
    if (!code.trim()) {
      setMessage({ type: 'error', text: t('checkin.dialog.enterCodeError') });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await Promise.race([
        checkInByCode(eventId, code),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10000)
        ),
      ]);

      if (result.success) {
        const userName = result.userName || t('checkin.dialog.defaultUser');
        setCheckinCount(prev => prev + 1);
        onSuccess();
        setMessage({
          type: 'success',
          text: t('checkin.dialog.checkinSuccess', { userName }),
        });
        toast.success(t('checkin.dialog.checkinSuccess', { userName }));
        setManualCode('');
      } else {
        const errorText = getErrorMessage(result.errorCode);
        setMessage({ type: 'error', text: errorText });
        toast.error(errorText);
      }

      if (fromScan) {
        setTimeout(() => {
          setMessage(null);
          scanner.resume();
        }, 2000);
      }
    } catch (err) {
      const errorText = err instanceof Error && err.message === 'timeout'
        ? t('checkin.dialog.errors.fetchFailed')
        : t('checkin.dialog.checkinError');
      setMessage({ type: 'error', text: errorText });
      toast.error(errorText);
      if (fromScan) {
        setTimeout(() => {
          setMessage(null);
          scanner.resume();
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // 扫描检测到的回调（通过 ref 保持最新）
  const handleCheckinFromScan = (code: string) => {
    processCheckin(code, true);
  };

  // 自动启动相机
  useEffect(() => {
    if (activeTab === 'scan' && !scanner.scanning && scanner.scanStatus === 'idle') {
      scanner.start().then((ok) => {
        if (!ok) setMessage({ type: 'error', text: t('checkin.dialog.cameraError') });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processCheckin(manualCode, false);
  };

  const handleClose = () => {
    scanner.cleanup();
    onClose();
  };

  const isFullscreen = activeTab === 'scan' && scanner.scanning;

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
          <button onClick={handleClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => { setActiveTab('manual'); scanner.cleanup(); }}
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
            onClick={() => { setActiveTab('scan'); setMessage(null); }}
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
                    if (val.length === 6) processCheckin(val, false);
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
            <QrScannerView
              videoRef={scanner.videoRef}
              canvasRef={scanner.canvasRef}
              scanning={scanner.scanning}
              qrDetected={scanner.qrDetected}
              scanStatus={scanner.scanStatus}
              isFullscreen={isFullscreen}
              message={message}
              loading={loading}
              onClose={handleClose}
            />
          )}

          {/* Message - 仅在手动输入模式下显示 */}
          {message && activeTab !== 'scan' && (
            <div className={`mt-4 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
