#!/bin/bash
# dispatch-claude-code.sh — 用 MiniMax API 调用 Claude Code
# 使用方式: ./dispatch-claude-code.sh -p "任务内容" -n "任务名"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="${HOME}"
RESULT_DIR="${HOME_DIR}/.openclaw/.claude-code-results"
META_FILE="${RESULT_DIR}/task-meta.json"
OUTPUT_FILE="/tmp/claude-code-output.txt"
TASK_OUTPUT="${RESULT_DIR}/task-output.txt"

# MiniMax API 配置
MINIMAX_API_KEY="your minimax api key"

# Defaults
PROMPT=""
TASK_NAME="adhoc-$(date +%s)"
WORKDIR="$HOME_DIR"

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        -p|--prompt) PROMPT="$2"; shift 2;;
        -n|--name) TASK_NAME="$2"; shift 2;;
        -w|--workdir) WORKDIR="$2"; shift 2;;
        *) echo "Unknown option: $1" >&2; exit 1;;
    esac
done

if [ -z "$PROMPT" ]; then
    echo "Error: --prompt is required" >&2
    exit 1
fi

# ---- 1. Write task metadata ----
mkdir -p "$RESULT_DIR"

jq -n \
    --arg name "$TASK_NAME" \
    --arg prompt "$PROMPT" \
    --arg workdir "$WORKDIR" \
    --arg ts "$(date -Iseconds)" \
    '{task_name: $name, prompt: $prompt, workdir: $workdir, started_at: $ts, status: "running"}' \
    > "$META_FILE"

echo "📋 Task: $TASK_NAME"
echo "   Working dir: $WORKDIR"

# Clear previous output
> "$OUTPUT_FILE"
> "$TASK_OUTPUT"

# ---- 2. Run Claude Code with MiniMax API ----
export ANTHROPIC_BASE_URL="https://api.minimaxi.com/anthropic"
export ANTHROPIC_AUTH_TOKEN="$MINIMAX_API_KEY"
export ANTHROPIC_MODEL="MiniMax-M2.5"

echo "🚀 Launching Claude Code (MiniMax-M2.5)..."

cd "$WORKDIR"

# Run Claude Code with the prompt
claude -p "$PROMPT" 2>&1 | tee "$TASK_OUTPUT"
EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "✅ Claude Code exited with code: $EXIT_CODE"

# Update meta
if [ -f "$META_FILE" ]; then
    jq --arg code "$EXIT_CODE" --arg ts "$(date -Iseconds)" \
        '. + {exit_code: ($code | tonumber), completed_at: $ts, status: "done"}' \
        "$META_FILE" > "${META_FILE}.tmp" && mv "${META_FILE}.tmp" "$META_FILE"
fi

echo "   Results saved to: ${TASK_OUTPUT}"

exit $EXIT_CODE
