# Skill: Claude Code Runner

通过 MiniMax API 调用 Claude Code 执行任务，支持回调通知。

## 触发条件

当用户请求：
- "调用 Claude Code"
- "用 Claude Code 执行"
- "run claude"
- 或者直接给出任务让调用 Claude Code

## 使用方法

### 1. 基本调用
```bash
cd ~/openclaw-claude-hook
./dispatch-claude-code.sh -p "任务内容" -n "任务名"
```

### 2. 带工作目录
```bash
./dispatch-claude-code.sh -p "任务" -w "/path/to/dir"
```

### 3. 参数说明
| 参数 | 说明 |
|------|------|
| `-p, --prompt` | 任务提示（必需）|
| `-n, --name` | 任务名称 |
| `-w, --workdir` | 工作目录（默认 ~）|

## 文件结构

```
~/openclaw-claude-hook/
├── dispatch-claude-code.sh   # 主调用脚本
├── server.js              # HTTP 回调服务（端口 3001）
└── notify-openclaw.sh    # Claude Code Hook 回调脚本
```

## 配置

MiniMax API 已配置：
- API URL: https://api.minimaxi.com/anthropic
- Model: MiniMax-M2.5
- API Key: 从环境变量读取

## 回调服务

启动回调服务：
```bash
cd ~/openclaw-claude-hook
node server.js
```

接口：
- `POST /hook` - 接收 Claude Code 回调
- `GET /status` - 健康检查
- `GET /results` - 查看最近结果

## Claude Code Hooks

已配置以下 Hooks（~/.claude/settings.local.json）：

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

## 示例

**调用 Claude Code 写一个爬虫**：
```bash
./dispatch-claude-code.sh -p "用 Python 写一个简单的爬虫，爬取豆瓣电影 Top250" -n "spider-task"
```
