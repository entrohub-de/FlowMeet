'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestAuthPage() {
  const [testEmail] = useState('test@example.com');
  const [testPassword] = useState('testpassword123');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testSupabaseAuth = async () => {
    setLoading(true);
    setLogs([]);

    try {
      addLog('开始测试 Supabase 认证...');
      addLog(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

      // 测试 1: 获取会话
      addLog('测试 1: 获取当前会话...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        addLog(`❌ 获取会话失败: ${sessionError.message}`);
      } else {
        addLog(`✅ 获取会话成功: ${sessionData.session ? '有会话' : '无会话'}`);
      }

      // 测试 2: 尝试注册（使用随机邮箱）
      const randomEmail = `test${Date.now()}@example.com`;
      addLog(`测试 2: 尝试注册新用户 (${randomEmail})...`);

      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: randomEmail,
          password: testPassword,
        });

        if (signUpError) {
          addLog(`❌ 注册失败: ${signUpError.message}`);
          addLog(`错误详情: ${JSON.stringify(signUpError)}`);
        } else {
          addLog(`✅ 注册成功!`);
          addLog(`用户 ID: ${signUpData.user?.id || '未知'}`);
        }
      } catch (err) {
        addLog(`❌ 注册异常: ${err instanceof Error ? err.message : String(err)}`);
        addLog(`异常类型: ${err instanceof Error ? err.constructor.name : typeof err}`);
        if (err instanceof Error && 'cause' in err) {
          addLog(`异常原因: ${JSON.stringify(err.cause)}`);
        }
      }

      // 测试 3: 尝试登录（使用错误密码）
      addLog(`测试 3: 尝试登录 (${testEmail})...`);

      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: 'wrongpassword',
        });

        if (signInError) {
          addLog(`❌ 登录失败 (预期): ${signInError.message}`);
        } else {
          addLog(`✅ 登录成功 (意外)`);
        }
      } catch (err) {
        addLog(`❌ 登录异常: ${err instanceof Error ? err.message : String(err)}`);
      }

      addLog('测试完成！');

    } catch (err) {
      addLog(`❌ 整体测试失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const testNetworkFetch = async () => {
    setLoading(true);
    setLogs([]);

    try {
      addLog('测试原生 fetch API...');

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        addLog('❌ 环境变量未设置');
        return;
      }

      addLog(`尝试连接: ${supabaseUrl}/auth/v1/health`);

      const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
      });

      addLog(`响应状态: ${response.status} ${response.statusText}`);

      const text = await response.text();
      addLog(`响应内容: ${text.substring(0, 200)}`);

      if (response.ok) {
        addLog('✅ 网络连接正常');
      } else {
        addLog('❌ 网络响应异常');
      }

    } catch (err) {
      addLog(`❌ Fetch 失败: ${err instanceof Error ? err.message : String(err)}`);
      if (err instanceof TypeError) {
        addLog('这可能是网络连接问题或 CORS 问题');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold mb-4">Supabase 认证诊断工具</h1>

        <div className="flex gap-4">
          <button
            onClick={testSupabaseAuth}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? '测试中...' : '测试 Supabase 认证'}
          </button>

          <button
            onClick={testNetworkFetch}
            disabled={loading}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50"
          >
            {loading ? '测试中...' : '测试网络连接'}
          </button>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-bold mb-2">诊断日志：</h2>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">点击上方按钮开始测试...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>

        <div className="bg-muted p-4 rounded-lg text-sm">
          <h3 className="font-bold mb-2">说明：</h3>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>测试 Supabase 认证:</strong> 测试完整的认证流程</li>
            <li><strong>测试网络连接:</strong> 测试原生 fetch 到 Supabase 的连接</li>
            <li>请在<strong>手机</strong>和<strong>电脑</strong>上分别测试</li>
            <li>截图或复制日志信息，帮助诊断问题</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
