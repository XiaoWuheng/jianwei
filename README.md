# 见微 · Jianwei

见微是一个本地运行的个人思考与研究工具。写下一句还没想清楚的话，沿着感兴趣的方向继续聊，查找能回溯的资料，再把想法整理成可以动手的计划。

[快速开始](#快速开始) · [完整演示](https://github.com/XiaoWuheng/jianwei/releases/latest) · [MIT 许可证](LICENSE)

[![见微首页，左侧是想法输入区，右侧是实时绘制的星盘](docs/media/home.webp)](https://github.com/XiaoWuheng/jianwei/releases/latest)

<details>
<summary>观看操作预览</summary>

![见微开场、表达想法、查看方向、追溯来源与展开行动计划](docs/media/preview.gif)

</details>

## 一个想法，四个视角

| 视角 | 可以做什么 |
| --- | --- |
| **继续聊** | 用自己的话补全目标、限制和疑问。原话、笔记和推演历史都能回看。 |
| **看方向** | 比较不同可能，查看各自的假设和适合先试的小实验。 |
| **联网研究** | 查找对标、案例、市场与开源参照。按出处回看公开来源，分清已有证据、推断和待验证的问题。 |
| **行动计划** | 按阶段列出任务、产出与验收标准，勾选进度，导出 Markdown 执行说明。 |

「我的想法」支持搜索、组合推演和带出处的长期摘要；「全部资料」汇集研究记录和收藏的来源。首次启动时数据库为空，演示中的内容仅用于展示操作流程。

## 快速开始

准备 [Node.js 24 或更新版本](https://nodejs.org/) 和 npm。在准备存放见微的目录里打开终端：

```sh
git clone https://github.com/XiaoWuheng/jianwei.git
cd jianwei
npm ci
npm run build
npm start
```

打开 [127.0.0.1:4317](http://127.0.0.1:4317)。Windows 上完成构建后也可以双击 `打开见微.vbs`，用 Chrome 或 Edge 直接全屏进入，按 F11 切换窗口显示。

### 连接思考和研究引擎

安装并登录 [Codex CLI](https://github.com/openai/codex#quickstart)，在终端用 `codex login status` 确认登录。Windows 推荐使用官方独立安装程序，让见微可以找到原生 `codex.exe`。安装后重新启动见微，打开「设置 → 思维与研究引擎」再检测连接。

如果可执行文件不在 `PATH`，启动前把 `JIANWEI_CODEX_PATH` 设为 Codex 原生可执行文件的绝对路径。见微沿用本机 Codex 的账号和配置，推演、联网研究和摘要需要网络及服务额度。

### 数据在哪里

见微只在本机回环地址上监听。想法、研究、记忆和任务等记录默认写入 `data/jianwei.sqlite`，可在设置里导出或导入完整 JSON 备份。发送给模型的任务输入和相关上下文会交给当前 Codex 配置对应的服务处理。语音输入由支持该功能的浏览器提供。

## 开发

```sh
npm run dev     # 打开 http://127.0.0.1:4317
npm test        # 本地测试，无需 Codex 登录
```

界面在 `src/`，本地 HTTP 服务、Codex 调用和 SQLite 存储在 `server/`。服务启动前可设置 `JIANWEI_PORT` 和 `JIANWEI_DATA_DIR`，改变监听端口和数据目录。

欢迎在 [Issues](https://github.com/XiaoWuheng/jianwei/issues) 反馈问题和讨论改进，或提交 PR。报告界面问题时，请附上复现步骤和窗口尺寸。分享截图或日志前请遮住自己的对话和账号信息。

## 许可证

见微原创代码使用 [MIT](LICENSE) 许可证。依赖和字体按各自许可证分发，详见 [第三方声明](THIRD_PARTY_NOTICES.md)。

宣讲片配乐为 Scott Buckley 的 [《Discovery》](https://www.scottbuckley.com.au/library/discovery/)，采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。片中使用剪辑片段并与旁白混音。发布页附可复制的署名。
