'use client';

import { useState, useRef, useEffect } from 'react';
import { X, QrCode, Keyboard, Camera, CheckCircle } from 'lucide-react';
import { checkInByCode } from '@/lib/api/checkin';
import jsQR from 'jsqr';

interface CheckinDialogProps {
  eventId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type TabType = 'scan' | 'manual';

export function CheckinDialog({ eventId, onClose, onSuccess }: CheckinDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('manual');
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [qrDetected, setQrDetected] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'detected' | 'processing'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  // 清理摄像头
  const cleanupCamera = () => {
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
  };

  useEffect(() => {
    return cleanupCamera;
  }, []);

  // 启动摄像头
  const startCamera = async () => {
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

        // 等待视频加载完成后开始扫描
        videoRef.current.onloadedmetadata = () => {
          scanIntervalRef.current = setInterval(() => {
            scanQRCode();
          }, 100); // 更频繁的扫描以获得更好的响应
        };
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
      setMessage({ type: 'error', text: '无法启动摄像头，请检查权限' });
    }
  };

  // 扫描二维码
  const scanQRCode = () => {
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
      // 检测到二维码
      setQrDetected(true);
      setScanStatus('detected');

      // 停止扫描并处理
      processingRef.current = true;
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }

      // 给用户视觉反馈后处理签到
      setTimeout(() => {
        setScanStatus('processing');
        handleCheckin(code.data);
      }, 300);
    } else {
      setQrDetected(false);
    }
  };

  // 处理签到
  const handleCheckin = async (code: string) => {
    if (!code.trim()) {
      setMessage({ type: 'error', text: '请输入签到码' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await checkInByCode(eventId, code);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `${result.userName || '用户'} 签到成功！`
        });
        setManualCode('');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch {
      setMessage({ type: 'error', text: '签到失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCheckin(manualCode);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">参与者签到</h2>
          <button
            onClick={onClose}
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
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'manual'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Keyboard className="w-5 h-5" />
            手动输入
          </button>
          <button
            onClick={() => {
              setActiveTab('scan');
              setMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeTab === 'scan'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <QrCode className="w-5 h-5" />
            扫描二维码
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'manual' ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  签到码
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="请输入签到码"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  请输入参与者的签到码（扫描二维码或手动输入）
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '处理中...' : '确认签到'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {!scanning ? (
                <div className="text-center py-8">
                  <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    点击按钮启动摄像头扫描二维码
                  </p>
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    启动摄像头
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`relative bg-black rounded-lg overflow-hidden aspect-video transition-all duration-300 ${
                    qrDetected ? 'ring-4 ring-green-500' : 'ring-2 ring-border'
                  }`}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* 扫描框 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative w-64 h-64 border-2 border-white/50 rounded-lg">
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
                    <div className="absolute top-4 left-4 right-4">
                      <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        scanStatus === 'scanning' ? 'bg-blue-500/80 text-white' :
                        scanStatus === 'detected' ? 'bg-green-500/80 text-white' :
                        scanStatus === 'processing' ? 'bg-yellow-500/80 text-white' :
                        'bg-gray-500/80 text-white'
                      }`}>
                        {scanStatus === 'scanning' && '正在扫描...'}
                        {scanStatus === 'detected' && '✓ 检测到二维码！'}
                        {scanStatus === 'processing' && '处理中...'}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    将二维码对准扫描框
                  </p>

                  <button
                    onClick={cleanupCamera}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    停止扫描
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Message */}
          {message && (
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
