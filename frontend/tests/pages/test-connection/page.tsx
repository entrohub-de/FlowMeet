'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface TestResult {
  success: boolean;
  session?: string;
  error?: string | null;
  supabaseUrl?: string;
  timestamp?: string;
  errorType?: string;
}

export default function TestConnectionPage() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult(null);

    try {
      // 测试 Supabase 连接
      const { data, error } = await supabase.auth.getSession();

      setResult({
        success: !error,
        session: data?.session ? '会话存在' : '无会话',
        error: error?.message || null,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '未设置',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : '未知错误',
        errorType: err instanceof Error ? err.constructor.name : typeof err,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl bg-card border border-border rounded-lg p-6 space-y-6">
        <h1 className="text-2xl font-bold">Supabase 连接测试</h1>

        <button
          onClick={testConnection}
          disabled={loading}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? '测试中...' : '测试连接'}
        </button>

        {result && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
              <h2 className="font-bold mb-2">
                {result.success ? '✅ 连接成功' : '❌ 连接失败'}
              </h2>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-bold mb-2">环境信息：</h3>
              <p className="text-sm">
                <strong>Supabase URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL || '未设置'}
              </p>
              <p className="text-sm">
                <strong>Key 已设置:</strong>{' '}
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '是' : '否'}
              </p>
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p>此页面用于测试 Supabase 连接是否正常。</p>
          <p className="mt-2">如果连接失败，请检查：</p>
          <ul className="list-disc list-inside mt-1">
            <li>`.env.local` 文件是否存在</li>
            <li>环境变量是否正确设置</li>
            <li>网络连接是否正常</li>
            <li>Supabase 项目是否在线</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
