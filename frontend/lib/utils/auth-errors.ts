const AUTH_ERROR_MAP: Record<string, { zh: string; en: string }> = {
  'Invalid login credentials': { zh: '邮箱或密码错误', en: 'Invalid email or password' },
  'Email not confirmed': { zh: '请先验证邮箱', en: 'Please verify your email first' },
  'User already registered': { zh: '该邮箱已注册', en: 'This email is already registered' },
  'Password should be at least 6 characters': { zh: '密码至少需要 6 个字符', en: 'Password must be at least 6 characters' },
  'Email rate limit exceeded': { zh: '操作过于频繁，请稍后再试', en: 'Too many requests, please try again later' },
  'Signup requires a valid password': { zh: '请输入有效密码', en: 'Please enter a valid password' },
  'Error sending confirmation email': { zh: '发送验证邮件失败，请稍后重试', en: 'Failed to send confirmation email, please try again later' },
  'error sending confirmation email': { zh: '发送验证邮件失败，请稍后重试', en: 'Failed to send confirmation email, please try again later' },
};

export function localizeAuthError(message: string, locale: string): string {
  const entry = AUTH_ERROR_MAP[message];
  if (entry) {
    return locale === 'zh' ? entry.zh : entry.en;
  }
  return message;
}
