# Accent Coach · 口音教练

一款英语发音训练应用，支持 **网页版（PWA）** 和 **iOS / Android 移动端**。选择一节课，听神经网络语音合成的参考句，自己跟读，立即获得基于 Azure 语音发音评估服务的 **逐词** 与 **音素级** 反馈。

网页版可直接在浏览器中使用，也可添加到主屏幕作为 PWA 运行；移动端通过 Expo Go 在真机运行，**无需 Apple 开发者账号**。

*English version: [README.en.md](README.en.md)*

---

## 功能特性

- **约 42 节课程**，按 6 周学习路径由易到难，从基础音素一直到接近母语者水准（弹舌 T、软 L、鼻化 T、TR/DR 颤化、弱读、语调等）
- **逐词评分**，在你读出的句子上就地高亮
- **逐音素 IPA 反馈** ——「你的 /θ/ 听起来像 /s/」
- **「重点练习」辅导卡片**，针对每个薄弱音素给出发音要领和可点击发音的示例词
- **Azure 神经网络 TTS 参考声音**（8 种美式 + 英式，附带 friendly 风格的 SSML 表情）
- **韵律 / 语调评分**
- **进度追踪** —— 连续天数、每节课最高分、逐日课程进度
- **完整 VoiceOver 支持**、尊重「降低动态效果」系统设置、符合 WCAG-AA 对比度
- 全程触觉反馈、评分过程可取消、麦克风权限优雅恢复
- **中英文双语界面** —— 设置中一键切换，偏好自动保存
- 暗色主题、首次使用引导流程、设置中可选参考发音者与界面语言

---

## 技术栈

**后端**（根目录）：Next.js 14，Node 18+，TypeScript
- `app/api/score-audio` —— 接收录音 WAV，做服务端静音裁剪，转发至 Azure Speech 发音评估 REST 接口，返回归一化的评分（包含 IPA 音素、Top-5 相似音素、韵律评分、逐音节评分、辅导建议）
- `app/api/tts` —— Azure 神经网络 TTS 代理（带内存 LRU 缓存 + 失败重试）

**移动端**（`/mobile`）：Expo SDK 54、React Native 0.81、expo-router、expo-audio、expo-haptics、AsyncStorage

**外部服务**：Microsoft Azure 认知服务 —— Speech（发音评估 + 神经网络 TTS）

---

## 前置条件

在开始前，请确保你已有：

1. **Node.js 18 或更高版本** —— [下载地址](https://nodejs.org)
2. **（仅移动端）一台 iPhone 或 Android 手机**，与你的电脑连接在同一 Wi-Fi 网络
3. **（仅移动端）Expo Go**，从 App Store 或 Google Play 安装
4. **免费的 Azure 账号** —— https://azure.microsoft.com/free（用于 Speech 服务）
5. **`git`**（在 macOS 上随 Xcode 命令行工具自带）

就这些。不需要 Xcode，不需要 Apple 开发者账号，不需要付费的 Azure 订阅。

---

## 获取 Azure Speech 密钥（5 分钟，完全免费）

1. 登录 https://portal.azure.com
2. 顶部搜索栏输入 **Speech services**，点击 **Create**（创建）
3. 填写表单：
   - **Subscription**（订阅）：使用你的默认订阅，免费试用即可
   - **Resource group**（资源组）：新建一个，比如 `accent-coach-rg`
   - **Region**（区域）：选离你近的区域，比如 `East US`（美东）
   - **Name**（名称）：任意全球唯一的名字，比如 `accent-coach-你的名字-1`
   - **Pricing tier**（定价层）：务必选 **Free F0**（每月免费 5 小时音频 + 50 万 TTS 字符）
4. 点击 **Review + create** → **Create**。等待约 30 秒部署完成。
5. 打开该资源 → 左侧栏点击 **Keys and Endpoint**（密钥和终结点）
6. 复制 **KEY 1**，记下 **Location/Region**（比如 `eastus`）

免费额度对个人使用来说极其宽裕 —— 你完全不可能用完。

---

## 本地部署

### 1. 克隆代码并安装依赖

```bash
git clone https://github.com/你的用户名/accent-coach.git
cd accent-coach

# 安装后端依赖
npm install

# 安装移动端依赖
cd mobile
npm install
cd ..
```

### 2. 配置 Azure 凭据

在**项目根目录**（不是 `mobile/`）新建一个文件 `.env.local`：

```bash
cp .env.example .env.local
```

打开 `.env.local`，粘贴你的 Azure 密钥和区域：

```
AZURE_SPEECH_KEY=把你的 KEY 1 贴在这里
AZURE_SPEECH_REGION=eastus
```

⚠️ **切勿把这个文件提交到 Git。** `.gitignore` 里已经排除了它，如果你 fork 本项目请再确认一遍。

### 3. 启动后端

在项目根目录：

```bash
npm run dev
```

后端会在 **http://0.0.0.0:3001** 启动（端口 3000 在 Mac 上经常被占用）。绑定到所有网络接口，这样你的手机才能通过 Wi-Fi 访问它。

这个终端窗口别关。

### 4. 启动 Expo 移动端开发服务器

再开一个终端：

```bash
cd mobile
npm start
```

Metro 会在 8081 端口启动。这个窗口也别关。

### 5. 用 iPhone 连接

1. 在手机上打开 **Expo Go**
2. 确认手机和 Mac 在**同一 Wi-Fi 网络**下
3. 在 Expo Go 里点 **"Enter URL manually"**（手动输入 URL），输入：
   ```
   exp://你的 Mac 局域网 IP:8081
   ```
   在 Mac 终端运行 `ipconfig getifaddr en0` 可以查到局域网 IP。
4. 点 **Connect**。首次打包约需 30 秒，之后应用就会启动。
5. 出现麦克风权限提示时请允许。

**另一种方式**：在 iPhone 上打开 Safari，访问 `http://你的 Mac 局域网 IP:8081`，会自动提示跳转到 Expo Go。

---

## 使用方法

1. 首次启动会显示 3 步的引导流程
2. 主页按难度分组显示所有课程 —— 建议从第 1 周初级课程开始，按顺序线性推进
3. 进入课程后，点 **试听** 听参考发音，再点 **录音** 跟读，读完后点 **停止**
4. 你会看到逐词评分、带就地高亮的原句、"重点练习"卡片（含音素提示和可点击的示例词），以及 **教练点评** 卡片
5. 点击高亮句子中的任意彩色词，可以单独听那个词的发音
6. 点右上角齿轮图标可切换 **界面语言**（English / 中文）和 **参考发音者**

你的学习进度仅保存在本机 —— 无账号、无云端同步。

---

## 故障排查

**在 Expo Go 里输入 `exp://...` 显示"无法连接"**
- 手机和 Mac 必须在同一 Wi-Fi 网络下（不能一个在访客网络，另一个在主网络）
- macOS 防火墙：系统设置 → 网络 → 防火墙 → 关闭，或允许 Node 入站
- 运行 `ipconfig getifaddr en0`，确认 Mac 局域网 IP 与手机在同一网段

**评分回来是 0，但能看到识别出来的文字**
- 说明 Azure 识别出了文字但没跑发音评估
- 查看 Next.js 终端里的 `[score-audio]` 日志，里面会打印 Azure 的原始响应
- 几乎总是 WAV 格式或采样率不对引起的

**报错 "Azure not configured"**
- 你还没建 `.env.local`，或者变量名写错了
- 修改 `.env.local` 后要重启 `npm run dev` —— Next.js 只在启动时读环境变量
- 密钥不要加引号：写 `AZURE_SPEECH_KEY=abc123`，不要写 `AZURE_SPEECH_KEY="abc123"`

**iPhone 提示麦克风权限被拒**
- iPhone 设置 → 隐私与安全性 → 麦克风 → Expo Go → 打开
- 如果你之前选了拒绝，应用内的 "Open Settings" 按钮会直接带你去设置页

**声音太小 / 只从听筒出不是扬声器**
- iOS 在录音后会把音频路由切到听筒。应用在每次播放前都会重置音频会话，但如果还是有问题，把 iPhone 侧边的静音开关拨到开（不显示橙色），播放时按音量加键调大系统音量。

**TTS 返回 401 Unauthorized**
- 你的 Azure 密钥不对、已过期，或者 `AZURE_SPEECH_REGION` 填的区域和密钥不匹配
- 去 Azure 门户 → Speech 资源 → Keys and Endpoint → 重新生成 Key 1 并替换 `.env.local`

**录音质量不佳 / 评分起伏大**
- 在安静环境录音，手机距离嘴 15–20 厘米
- 点 Record 后先停顿 0.3 秒再说话 —— 应用内部已有 400ms 的音频会话稳定延迟，但极快的跟读仍可能错过前导音
- 如果某次录音效果明显差，用新的 **Cancel（取消）** 按钮丢弃，直接重录，不消耗 Azure 额度

---

## 费用

个人使用场景下，完全 **$0/月**。Azure 免费 F0 层包括：
- 每月 **5 小时音频** 的发音评估（约 3,600 次尝试）
- 每月 **50 万字符** 的神经网络 TTS

想达到这个上限得每天极高强度练习。而且后端的 TTS LRU 缓存让你反复点 Listen 时只会命中缓存，不再消耗 Azure 配额。

如果真的超了，升级到 Standard S0 按量付费大约是每小时 **$1** 的发音评估 + 每百万字符 **$16** 的 TTS。

---

## 查看 Azure 使用量

Azure 门户 → 你的 Speech 资源 → 左侧栏 **Metrics**（指标）。常用指标：
- **Total Transactions** —— 所有 API 调用（TTS + 发音评估）
- **Audio Seconds Processed** —— 发音评估专用
- **Synthesized Characters** —— TTS 专用

时间范围选最近 24 小时或 7 天，聚合方式选 **Sum**（求和）。

---

## 开源许可

本项目采用 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 许可协议。

- **可以**：自由复制、修改、二次分发，用于个人学习和非商业用途
- **必须**：署名原作者，注明修改内容，衍生作品必须以相同许可协议发布（ShareAlike）
- **禁止**：任何形式的商业使用（包括但不限于收费、广告变现、付费增值服务等）

如需商业授权，请联系项目作者。

---

## 致谢

灵感来源于市面上的口音训练商业应用。发音反馈由 Microsoft Azure 认知服务驱动。图标来自 Ionicons（Expo 自带）。
