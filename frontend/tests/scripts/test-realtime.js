// 测试 Supabase Realtime 功能
// 在用户端浏览器控制台运行此代码

async function testRealtime() {
  const supabase = (await import('./lib/supabase/client.js')).supabase;

  console.log('=== 测试 Realtime 订阅 ===');

  // 获取当前用户
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ 未登录');
    return;
  }

  console.log('✅ 当前用户 ID:', user.id);

  // 订阅 evt_signups 表的变更
  const channel = supabase
    .channel('test-checkin-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'evt_signups',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        console.log('🎉 [Realtime] 收到更新事件!', payload);
        console.log('  - 事件类型:', payload.eventType);
        console.log('  - 旧数据:', payload.old);
        console.log('  - 新数据:', payload.new);
      }
    )
    .subscribe((status) => {
      console.log('📡 订阅状态:', status);

      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime 订阅成功!');
        console.log('');
        console.log('👉 现在请在 Host 端为你签到，看看能否收到实时更新');
        console.log('');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime 订阅失败!');
      }
    });

  // 保存 channel 到 window 以便手动取消订阅
  window.realtimeChannel = channel;

  console.log('');
  console.log('💡 提示:');
  console.log('  - 订阅已启动，等待实时更新...');
  console.log('  - 要停止订阅，运行: window.realtimeChannel.unsubscribe()');
  console.log('');
}

// 运行测试
window.testRealtime = testRealtime;
console.log('🔧 Realtime 测试工具已加载!');
console.log('运行 testRealtime() 来测试实时订阅');
