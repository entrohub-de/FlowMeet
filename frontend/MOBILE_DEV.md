# 📱 手机访问本地开发环境指南

## 问题说明
在手机上访问本地开发环境时出现 "Load failed" 错误，这是因为 Next.js 开发服务器默认只监听 localhost。

## 解决方案

### 1. 启动适用于手机访问的开发服务器

使用新的命令启动开发服务器：

```bash
npm run dev:mobile
```

这个命令会让服务器监听 `0.0.0.0`，允许局域网内的其他设备访问。

### 2. 获取你的电脑 IP 地址

**Windows:**
```bash
ipconfig
```
查找 "IPv4 地址"，通常是 `192.168.x.x` 格式

**Mac/Linux:**
```bash
ifconfig
# 或
ip addr show
```

### 3. 在手机上访问

假设你的电脑 IP 是 `192.168.1.100`，在手机浏览器中访问：

```
http://192.168.1.100:3000
```

### 4. 确保网络配置正确

#### ✅ 检查清单：

- [ ] **手机和电脑在同一个 WiFi 网络**
- [ ] **Windows 防火墙允许端口 3000**
- [ ] **使用 `npm run dev:mobile` 启动服务器**
- [ ] **Supabase 环境变量配置正确**

#### 配置 Windows 防火墙（如果需要）：

1. 打开 Windows Defender 防火墙
2. 点击"高级设置"
3. 点击"入站规则" > "新建规则"
4. 选择"端口" > "TCP" > 输入 `3000`
5. 选择"允许连接"
6. 完成设置

### 5. 环境变量检查

确保 `.env.local` 文件包含正确的 Supabase 配置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**重要：** 这些 URL 应该是 Supabase 的云服务地址（以 `https://` 开头），而不是 localhost。

### 6. 常见问题排查

#### 问题 1: "Load failed" 错误
- **原因**: 无法连接到服务器
- **解决**:
  - 检查是否使用 `npm run dev:mobile`
  - 确认手机和电脑在同一网络
  - 检查防火墙设置

#### 问题 2: 页面加载但登录失败
- **原因**: Supabase 配置问题
- **解决**:
  - 检查 `.env.local` 中的 Supabase URL
  - 确保使用的是云服务 URL，不是 localhost
  - 重启开发服务器

#### 问题 3: HTTPS 证书警告
- **原因**: 某些功能需要 HTTPS
- **解决**:
  - 本地开发时可以忽略警告
  - 或使用 ngrok 等工具提供 HTTPS

### 7. 使用 ngrok（可选，提供 HTTPS）

如果需要 HTTPS 或者不在同一网络：

1. 安装 ngrok: https://ngrok.com/
2. 启动开发服务器: `npm run dev`
3. 在另一个终端运行: `ngrok http 3000`
4. 使用 ngrok 提供的 URL 在手机上访问

## 推荐开发流程

### 仅本机开发：
```bash
npm run dev
```

### 需要手机测试：
```bash
npm run dev:mobile
```
然后在手机访问: `http://你的电脑IP:3000`

## 安全提示

⚠️ **注意事项：**
- `dev:mobile` 模式会暴露你的开发服务器到局域网
- 仅在可信网络中使用
- 不要在公共 WiFi 中使用此模式
- 生产环境请使用正确的部署流程

## 调试技巧

### 查看详细错误信息：

在手机浏览器中打开开发者工具（如果支持），或者：

1. 在电脑上的开发服务器终端查看错误日志
2. 使用浏览器的网络面板检查失败的请求
3. 确认 Supabase API 调用是否成功

### 测试连接：

在手机浏览器中先访问：
```
http://你的电脑IP:3000/api/health
```
（如果你有健康检查端点）

或者简单地访问首页，看是否能加载静态内容。
