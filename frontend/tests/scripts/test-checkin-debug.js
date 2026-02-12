// 完整的签到调试测试脚本
// 在浏览器控制台运行此代码

const eventId = '631b906b-9bc7-4d7f-b679-4a33c4eebb25';

// 1. 检查当前登录用户
async function checkCurrentUser() {
  const supabase = (await import('./lib/supabase/client.js')).supabase;
  const { data: { user } } = await supabase.auth.getUser();
  console.log('=== 当前登录用户 ===');
  console.log('User ID:', user?.id);
  console.log('Email:', user?.email);

  // 检查用户角色
  const { data: role } = await supabase
    .from('usr_role')
    .select('role')
    .eq('user_id', user?.id)
    .single();
  console.log('User Role:', role?.role);

  return user;
}

// 2. 获取活动的所有报名用户
async function getEventSignups() {
  const supabase = (await import('./lib/supabase/client.js')).supabase;

  console.log('\n=== 活动报名列表 ===');
  const { data, error } = await supabase
    .from('evt_signups')
    .select(`
      signup_id,
      user_id,
      checked_in,
      checked_in_at,
      usr_profiles!inner(nickname)
    `)
    .eq('event_id', eventId)
    .eq('status', 'active');

  if (error) {
    console.error('查询错误:', error);
    return [];
  }

  console.table(data?.map(s => ({
    nickname: s.usr_profiles?.nickname || '未知',
    user_id: s.user_id.substring(0, 8),
    checked_in: s.checked_in,
    checked_in_at: s.checked_in_at
  })));

  return data;
}

// 3. 测试为某个用户签到
async function testCheckin(userId) {
  console.log('\n=== 测试签到 ===');
  console.log('为用户签到:', userId);

  const { checkInParticipant } = await import('./lib/api/checkin.js');
  const result = await checkInParticipant(eventId, userId);

  console.log('签到结果:', result);

  // 验证数据库是否真的更新了
  const supabase = (await import('./lib/supabase/client.js')).supabase;
  const { data: verification } = await supabase
    .from('evt_signups')
    .select('checked_in, checked_in_at')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  console.log('数据库验证:', verification);

  return result;
}

// 4. 测试 RLS 策略
async function testRLSPolicy() {
  const supabase = (await import('./lib/supabase/client.js')).supabase;
  const { data: { user } } = await supabase.auth.getUser();

  console.log('\n=== 测试 RLS 策略 ===');

  // 找一个未签到的用户
  const { data: signups } = await supabase
    .from('evt_signups')
    .select('user_id, checked_in')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .eq('checked_in', false)
    .limit(1);

  if (!signups || signups.length === 0) {
    console.log('没有未签到的用户');
    return;
  }

  const testUserId = signups[0].user_id;
  console.log('测试用户 ID:', testUserId);
  console.log('当前用户 ID:', user.id);

  // 尝试直接更新
  const { data: updateData, error: updateError } = await supabase
    .from('evt_signups')
    .update({
      checked_in: true,
      checked_in_at: new Date().toISOString()
    })
    .eq('event_id', eventId)
    .eq('user_id', testUserId)
    .select();

  console.log('直接更新结果:');
  console.log('  Data:', updateData);
  console.log('  Error:', updateError);

  if (updateError) {
    console.error('❌ RLS 策略阻止了更新!');
    console.error('错误详情:', updateError);
  } else if (!updateData || updateData.length === 0) {
    console.warn('⚠️ 更新没有影响任何行 (可能被 RLS 策略阻止)');
  } else {
    console.log('✅ 更新成功!');
  }
}

// 运行所有测试
async function runAllTests() {
  await checkCurrentUser();
  const signups = await getEventSignups();

  if (signups && signups.length > 0) {
    // 找一个未签到的用户测试
    const uncheckedUser = signups.find(s => !s.checked_in);
    if (uncheckedUser) {
      await testCheckin(uncheckedUser.user_id);
    }
  }

  await testRLSPolicy();

  // 再次查看报名列表，验证是否更新
  await getEventSignups();
}

// 导出函数供手动调用
window.checkinDebug = {
  checkCurrentUser,
  getEventSignups,
  testCheckin,
  testRLSPolicy,
  runAllTests
};

console.log('🔧 调试工具已加载!');
console.log('运行 checkinDebug.runAllTests() 来执行所有测试');
console.log('或者分别调用:');
console.log('  - checkinDebug.checkCurrentUser()');
console.log('  - checkinDebug.getEventSignups()');
console.log('  - checkinDebug.testCheckin(userId)');
console.log('  - checkinDebug.testRLSPolicy()');
