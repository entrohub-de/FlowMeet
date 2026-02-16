'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';

export type ScanStatus = 'idle' | 'scanning' | 'detected' | 'processing';

interface UseQrScannerOptions {
  onDetected: (data: string) => void;
}

export function useQrScanner({ onDetected }: UseQrScannerOptions) {
  const [scanning, setScanning] = useState(false);
  const [qrDetected, setQrDetected] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const cleanup = useCallback(() => {
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
    return cleanup;
  }, [cleanup]);

  const scanFrame = useCallback(() => {
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
        onDetectedRef.current(code.data);
      }, 300);
    } else {
      setQrDetected(false);
    }
  }, []);

  const startScanInterval = useCallback(() => {
    if (!scanIntervalRef.current) {
      scanIntervalRef.current = setInterval(scanFrame, 100);
    }
  }, [scanFrame]);

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setScanning(true);
        setScanStatus('scanning');

        videoRef.current.onloadedmetadata = () => {
          startScanInterval();
        };
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to start camera:', error);
      return false;
    }
  }, [startScanInterval]);

  const resume = useCallback(() => {
    setQrDetected(false);
    setScanStatus('scanning');
    processingRef.current = false;
    startScanInterval();
  }, [startScanInterval]);

  return {
    videoRef,
    canvasRef,
    scanning,
    qrDetected,
    scanStatus,
    start,
    cleanup,
    resume,
  };
}
