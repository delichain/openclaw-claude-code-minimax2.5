# OpenClaw Claude Code Runner (MiniMax API)

通过 MiniMax API 调用 Claude Code 执行任务，支持回调通知。

## 功能特性

- 🚀 通过 MiniMax API 调用 Claude Code
- 🔄 支持回调通知（Hook）
- 📡 HTTP 服务端口 3001
- ⚡ 支持任务派发、状态查询

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/delichain/openclaw-claude-code-minimax2.5.git
cd openclaw-claude-code-minimax2.5
```

### 2. 配置环境变量

在 `~/.zshrc` 或 `~/.bashrc` 中添加：

```bash
export ANTHROPIC_BASE_URL="https://api.minimaxi.com/anthropic"
export ANTHROPIC_AUTH_TOKEN="your-minimax-api-key"
export ANTHROPIC_MODEL="MiniMax-M2.5"
```

然后执行 `source ~/.zshrc` 或重启终端。

### 3. 运行任务

```bash
./dispatch-claude-code.sh -p "任务内容" -n "任务名"
```

参数说明：
| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-p, --prompt` | 任务提示（必需）| - |
| `-n, --name` | 任务名称 | `adhoc-时间戳` |
| `-w, --workdir` | 工作目录 | `~` |

## 文件结构

```
.
├── dispatch-claude-code.sh   # 主调用脚本
├── notify-openclaw.sh        # Hook 回调脚本
├── server.js               # HTTP 回调服务
├── SKILL.md                # OpenClaw Skill 说明
├── README.md               # 英文文档
└── README_ZH.md            # 中文文档
```

## HTTP 服务

启动回调服务：

```bash
node server.js
```

接口：
- `GET /status` - 健康检查
- `GET /results` - 查看最近结果
- `POST /hook` - 接收 Claude Code 回调

## Claude Code Hooks 配置

在 `~/.claude/settings.local.json` 中配置：

```json
{
  "hooks": {
    "Stop": [{"command": "~/openclaw-claude-hook/notify-openclaw.sh"}],
    "SessionEnd": [{"command": "~/openclaw-claude-hook/notify-openclaw.sh"}]
  }
}
```

## 工作流程

1. 用户通过 Skill 调用 Claude Code
2. Claude Code 执行任务
3. 任务完成后触发 Stop Hook
4. Hook 调用回调服务
5. 回调服务通知 OpenClaw
6. OpenClaw 将结果发送给用户

## 使用示例

### 调用 Claude Code 写一个爬虫

```bash
./dispatch-claude-code.sh -p "用 Python 写一个简单的爬虫，爬取豆瓣电影 Top250" -n "spider-task"
```

### 每天自动执行任务（Cron）

```bash
# 每天上午 9 点执行
0 9 * * * /path/to/dispatch-claude-code.sh -p "你的任务" -n "daily-task"
```

## 注意事项

- 需要提前配置 MiniMax API Key
- 确保端口 3001 可用
- Hook 需要 Claude Code 交互模式

## 相关链接

- [OpenClaw 文档](https://docs.openclaw.ai)
- [Claude Code 文档](https://code.claude.com)
- [MiniMax API 文档](https://platform.minimaxi.com)

## License

MIT
