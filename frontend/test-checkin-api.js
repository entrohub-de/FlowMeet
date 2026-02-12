// 测试签到 API
// 在浏览器控制台运行此代码

// 配对测试活动的信息
const eventId = '631b906b-9bc7-4d7f-b679-4a33c4eebb25';
const checkinCode = '888888';

// 测试获取活动信息
async function testGetEvent() {
  const supabase = (await import('./lib/supabase/client.js')).supabase;
  
  const { data, error } = await supabase
    .from('evt_events')
    .select('event_id, name, checkin_code')
    .eq('event_id', eventId)
    .single();
  
  console.log('活动信息:', data, error);
  return data;
}

// 运行测试
testGetEvent();
