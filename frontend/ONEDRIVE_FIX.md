# OneDrive 构建问题解决方案

## 问题描述

在 OneDrive 同步的目录中使用 Next.js 时，可能会遇到以下错误：

```
Error: EINVAL: invalid argument, readlink '.next/server/chunks'
```

这是因为 OneDrive 会干扰 Next.js 构建过程中创建的符号链接。

## 解决方案

项目已经配置了自动化脚本来解决这个问题：

### 自动化（推荐）

每次运行 `npm run build` 时，会自动：
1. **构建前 (prebuild)**: 清理旧的 `.next` 目录，并设置 OneDrive 排除属性
2. **构建 (build)**: 正常构建
3. **构建后 (postbuild)**: 为新创建的 `.next` 目录设置 OneDrive 排除属性

### 手动清理

如果遇到构建问题，可以手动运行：

```bash
npm run clean
```

### 一次性手动设置（可选）

如果你想手动设置 OneDrive 排除，可以在 PowerShell 中运行：

```powershell
cd frontend
.\fix-onedrive.ps1
```

或者直接使用 Windows 命令：

```cmd
attrib +U frontend\.next /S /D
attrib +U frontend\node_modules /S /D
```

## 工作原理

- `scripts/clean-build.js`: 在构建前清理并设置 OneDrive 排除
- `scripts/postbuild-onedrive.js`: 在构建后为 `.next` 目录设置 OneDrive 排除
- `package.json`: 配置了 `prebuild` 和 `postbuild` 钩子

## 注意事项

- 这些脚本只在 Windows 系统上设置 OneDrive 排除
- 在其他操作系统（Linux、macOS）上，脚本会跳过 OneDrive 相关操作
- Vercel 等云端构建环境不受此问题影响
