// 测试 RLS 策略详细调试
// 在浏览器控制台运行

const eventId = '631b906b-9bc7-4d7f-b679-4a33c4eebb25';

async function testRLSDetailed() {
  const supabase = (await import('./lib/supabase/client.js')).supabase;

  console.log('=== 1. 检查当前用户和角色 ===');
  const { data: { user } } = await supabase.auth.getUser();
  console.log('当前用户 ID:', user?.id);
  console.log('当前用户 Email:', user?.email);

  // 检查角色
  const { data: roleData, error: roleError } = await supabase
    .from('usr_role')
    .select('*')
    .eq('user_id', user?.id)
    .single();

  console.log('角色查询结果:', { roleData, roleError });

  if (!roleData || roleData.role !== 'host') {
    console.error('❌ 当前用户不是 host 角色！');
    return;
  }

  console.log('✅ 确认是 host 角色:', roleData.role);

  console.log('\n=== 2. 查找一个未签到的用户 ===');
  const { data: signups, error: signupsError } = await supabase
    .from('evt_signups')
    .select('signup_id, user_id, checked_in')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .eq('checked_in', false)
    .limit(1);

  console.log('查询结果:', { signups, signupsError });

  if (!signups || signups.length === 0) {
    console.log('没有未签到的用户');
    return;
  }

  const testUser = signups[0];
  console.log('测试用户:', testUser);
  console.log('  signup_id:', testUser.signup_id);
  console.log('  user_id:', testUser.user_id);
  console.log('  checked_in:', testUser.checked_in);

  console.log('\n=== 3. 测试直接 UPDATE ===');
  const updatePayload = {
    checked_in: true,
    checked_in_at: new Date().toISOString()
  };
  console.log('更新数据:', updatePayload);

  const { data: updateData, error: updateError } = await supabase
    .from('evt_signups')
    .update(updatePayload)
    .eq('event_id', eventId)
    .eq('user_id', testUser.user_id)
    .select();

  console.log('更新结果:');
  console.log('  updateData:', updateData);
  console.log('  updateData.length:', updateData?.length);
  console.log('  updateError:', updateError);

  if (updateError) {
    console.error('❌ 更新失败:', updateError);
    return;
  }

  if (!updateData || updateData.length === 0) {
    console.error('❌ 更新没有影响任何行 - RLS 策略可能阻止了更新');

    // 再次检查 RLS 策略
    console.log('\n=== 4. 验证 RLS 策略 ===');
    console.log('当前用户是否为 host?', roleData.role === 'host');
    console.log('目标用户 ID:', testUser.user_id);
    console.log('当前用户 ID:', user?.id);
    console.log('是否相同?', testUser.user_id === user?.id);

    return;
  }

  console.log('✅ 更新成功!');
  console.log('更新后的数据:', updateData[0]);

  console.log('\n=== 5. 验证数据库 ===');
  const { data: verification } = await supabase
    .from('evt_signups')
    .select('checked_in, checked_in_at')
    .eq('event_id', eventId)
    .eq('user_id', testUser.user_id)
    .single();

  console.log('数据库验证:', verification);
}

// 运行测试
window.testRLS = testRLSDetailed;
console.log('🔧 RLS 测试工具已加载!');
console.log('运行 testRLS() 来测试 RLS 策略');
