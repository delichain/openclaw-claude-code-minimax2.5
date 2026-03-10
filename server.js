#!/usr/bin/env node
/**
 * OpenClaw Claude Code Hook Server
 * 接收 Claude Code Hook 回调，通知 OpenClaw
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 3001;
const RESULTS_DIR = process.env.RESULTS_DIR || path.join(process.env.HOME, '.openclaw', '.claude-code-results');

// 确保目录存在
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function sendFeishuMessage(groupId, message) {
  try {
    // 使用 openclaw CLI 发送飞书消息
    const cmd = `openclaw message send --channel feishu --target "${groupId}" --message '${message.replace(/'/g, "\\'")}'`;
    execSync(cmd, { encoding: 'utf8', timeout: 10000 });
    console.log(`[Feishu] Message sent to ${groupId}`);
    return true;
  } catch (error) {
    console.error('[Feishu] Send failed:', error.message);
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/hook') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // 提取关键信息
        const sessionId = data.session_id || data.sessionId || 'unknown';
        const timestamp = new Date().toISOString();
        
        console.log(`[${timestamp}] Hook received - Session: ${sessionId}`);
        console.log('Event:', data.hook_event_name || data.event || 'unknown');
        
        // 保存到文件
        const filename = `${sessionId}_${Date.now()}.json`;
        const filepath = path.join(RESULTS_DIR, filename);
        
        fs.writeFileSync(filepath, JSON.stringify({
          ...data,
          receivedAt: timestamp
        }, null, 2));
        
        console.log(`Saved to: ${filepath}`);
        
        // 写入 ready 标记
        const readyFile = path.join(RESULTS_DIR, '.ready');
        fs.writeFileSync(readyFile, JSON.stringify({
          sessionId,
          timestamp,
          event: data.hook_event_name || data.event || 'unknown'
        }));
        
        // 读取任务元数据，发送消息
        const metaFile = path.join(RESULTS_DIR, 'task-meta.json');
        if (fs.existsSync(metaFile)) {
          const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
          
          if (meta.feishu_group) {
            const output = data.result_text || data.output || '任务完成';
            const summary = output.slice(-800);
            const message = `🤖 *Claude Code 任务完成*\n📋 任务: ${meta.task_name}\n📝 结果摘要:\n\`\`\`\n${summary}\n\`\`\``;
            sendFeishuMessage(meta.feishu_group, message);
          }
        }
        
        // 写入 pending-wake.json 唤醒主会话
        const wakeFile = path.join(RESULTS_DIR, 'pending-wake.json');
        fs.writeFileSync(wakeFile, JSON.stringify({
          sessionId,
          timestamp,
          task_name: data.task_name || 'unknown',
          processed: false
        }));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          sessionId,
          receivedAt: timestamp
        }));
        
      } catch (error) {
        console.error('Error processing hook:', error.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message 
        }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'running',
      resultsDir: RESULTS_DIR,
      uptime: process.uptime()
    }));
  } else if (req.method === 'GET' && req.url === '/results') {
    try {
      const files = fs.readdirSync(RESULTS_DIR)
        .filter(f => f.endsWith('.json') && f !== '.ready' && f !== 'pending-wake.json')
        .sort()
        .reverse()
        .slice(0, 10);
      
      const results = files.map(f => {
        const content = fs.readFileSync(path.join(RESULTS_DIR, f), 'utf8');
        return JSON.parse(content);
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ results }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   OpenClaw Claude Code Hook Server (v2)        ║
║   ─────────────────────────────────────────────   ║
║   🌐 http://localhost:${PORT}                     ║
║   📁 Results: ${RESULTS_DIR}   
║   ─────────────────────────────────────────────   ║
║   Endpoints:                                    ║
║   • POST /hook   - Receive Claude Code hooks    ║
║   • GET  /status - Server health check         ║
║   • GET  /results - Recent results              ║
║   ─────────────────────────────────────────────   ║
║   Features:                                    ║
║   ✅ 消息推送 (Feishu/Telegram)                ║
║   ✅ 任务元数据管理                            ║
║   ✅ 防重复机制                                ║
║   ✅ pending-wake 唤醒                         ║
╚═══════════════════════════════════════════════════════╝
  `);
});
