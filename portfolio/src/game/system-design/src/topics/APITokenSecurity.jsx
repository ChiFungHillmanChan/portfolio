import { useState } from 'react';
import TopicTabs from '../components/TopicTabs';
import RelatedTopics from '../components/RelatedTopics';

const quizData = [
  {
    question: 'Frontend 直接 call AI API 最大嘅風險係咩？',
    options: [
      { text: 'API response 會比較慢', correct: false, explanation: '速度唔係主要問題，backend proxy 嘅 latency 增加好少。' },
      { text: 'API Key 會暴露喺 client-side code，任何人都可以用 DevTools 睇到', correct: true, explanation: 'Frontend 嘅所有 code 都係公開嘅，用 DevTools 就可以攞到 API Key。一旦洩露，你嘅帳單會被人任用。' },
      { text: '會觸發 CORS 錯誤', correct: false, explanation: 'CORS 係技術問題可以解決，但 key 洩露係安全災難。' },
      { text: '冇辦法做 caching', correct: false, explanation: 'Caching 同 API Key 暴露係兩回事。' },
    ],
  },
  {
    question: 'Authentication 同 Authorization 嘅分別係咩？',
    options: [
      { text: '一樣嘅嘢，只係叫法唔同', correct: false, explanation: '兩者完全唔同：一個驗證身份，一個決定權限。' },
      { text: 'Authentication 驗證「你係邊個」，Authorization 決定「你可以做咩」', correct: true, explanation: 'API Key 通常同時做埋兩樣嘢，所以一旦洩露就雙重災難——身份同權限都俾人攞到。' },
      { text: 'Authentication 係前端嘅嘢，Authorization 係後端嘅嘢', correct: false, explanation: '兩者都應該喺後端驗證，前端只係提交 credentials。' },
      { text: 'Authentication 用密碼，Authorization 用 token', correct: false, explanation: '兩者都可以用 token 實現，分別在於驗證嘅內容唔同。' },
    ],
  },
  {
    question: '以下邊個係最安全嘅 API Key 管理策略（Production 環境）？',
    options: [
      { text: '放喺 .env 檔案 push 上 private GitHub repo', correct: false, explanation: 'Private repo 都可能被 fork 或者權限設定錯誤而洩露。.env 應該永遠 gitignore。' },
      { text: '用 base64 encode 後放喺 frontend', correct: false, explanation: 'Base64 唔係加密，任何人都可以 decode。呢個做法等於冇保護。' },
      { text: '用 Cloud Secret Manager + Backend Proxy + Key Rotation', correct: true, explanation: 'Production 最佳實踐：Cloud Secret Manager 加密存儲 + IAM 權限控制 + audit log，Backend Proxy 隔離 key，定期 rotation 防止長期洩露。' },
      { text: '用 localStorage 加密存儲', correct: false, explanation: 'localStorage 係 client-side，任何 JavaScript 都可以讀取，唔安全。' },
    ],
  },
];

const relatedTopics = [
  { slug: 'ai-model-comparison', label: 'AI 模型深入對比' },
  { slug: 'ai-tools-landscape', label: 'AI 工具全景圖' },
  { slug: 'authentication', label: 'Authentication 驗證' },
  { slug: 'mcp-protocol', label: 'MCP 模型上下文協議' },
];

const FACT_CHECK_META = {
  asOf: '2026-02-16',
  sources: ['OpenAI pricing', 'Anthropic pricing', 'Gemini API pricing', 'DeepSeek API pricing'],
};

function OverviewTab() {
  return (
    <div className="card">
      <h2>API Token 安全與成本</h2>
      <div className="subtitle">Token 生命週期、Authentication vs Authorization、模型定價</div>
      <p>
        用 AI API 嘅第一步就係攞個 API Key。但好多人唔知，呢個 key 一旦洩露，你嘅 <strong style={{ color: '#ef4444' }}>錢同數據</strong> 就會同時出事。API Token 唔止係身份驗證咁簡單——佢決定咗你係邊個（Authentication）、你可以做咩（Authorization）、同你要俾幾多錢。
      </p>
      <p>而家 AI API 嘅定價差異極大，揀錯模型分分鐘月尾帳單嚇死你。所以搞清楚 token security 同 cost 係每個工程師嘅基本功。</p>

      <div className="diagram-container">
        <svg viewBox="0 0 750 470" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-ts" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
          </defs>
          <text x="375" y="28" textAnchor="middle" fill="#e2e8f0" fontSize="15" fontWeight="700">2026 主流 AI 模型 API 定價對比</text>

          {/* Table header */}
          <rect x="20" y="42" width="710" height="30" rx="6" fill="#1e293b" />
          <text x="40" y="62" fill="#9ca3af" fontSize="10" fontWeight="700">模型</text>
          <text x="280" y="62" fill="#9ca3af" fontSize="10" fontWeight="700">Input (per 1M tokens)</text>
          <text x="480" y="62" fill="#9ca3af" fontSize="10" fontWeight="700">Output (per 1M tokens)</text>
          <text x="650" y="62" fill="#9ca3af" fontSize="10" fontWeight="700">定位</text>

          {/* Row 1: Claude Opus 4.6 */}
          <rect x="20" y="76" width="710" height="28" rx="0" fill="#1a1d27" stroke="#475569" strokeWidth="0.5" />
          <text x="40" y="95" fill="#a78bfa" fontSize="10" fontWeight="600">Claude Opus 4.6</text>
          <text x="280" y="95" fill="#ef4444" fontSize="10">$5.00</text>
          <text x="480" y="95" fill="#ef4444" fontSize="10">$25.00</text>
          <text x="650" y="95" fill="#9ca3af" fontSize="9">旗艦推理</text>

          {/* Row 2: Claude Sonnet 4.5 */}
          <rect x="20" y="104" width="710" height="28" rx="0" fill="#1a1d27" stroke="#475569" strokeWidth="0.5" />
          <text x="40" y="123" fill="#a78bfa" fontSize="10" fontWeight="600">Claude Sonnet 4.5</text>
          <text x="280" y="123" fill="#F59E0B" fontSize="10">$3.00</text>
          <text x="480" y="123" fill="#F59E0B" fontSize="10">$15.00</text>
          <text x="650" y="123" fill="#9ca3af" fontSize="9">性價比之選</text>

          {/* Row 3: GPT-5.2 Codex */}
          <rect x="20" y="132" width="710" height="28" rx="0" fill="#1a1d27" stroke="#475569" strokeWidth="0.5" />
          <text x="40" y="151" fill="#34d399" fontSize="10" fontWeight="600">GPT-5.2 Codex</text>
          <text x="280" y="151" fill="#F59E0B" fontSize="10">$1.75</text>
          <text x="480" y="151" fill="#F59E0B" fontSize="10">$14.00</text>
          <text x="650" y="151" fill="#9ca3af" fontSize="9">Agentic 編程</text>

          {/* Row 4: Gemini 3 Pro */}
          <rect x="20" y="160" width="710" height="28" rx="0" fill="#1a1d27" stroke="#475569" strokeWidth="0.5" />
          <text x="40" y="179" fill="#F59E0B" fontSize="10" fontWeight="600">Gemini 3 Pro</text>
          <text x="280" y="179" fill="#F59E0B" fontSize="10">$2.00 - $4.00</text>
          <text x="480" y="179" fill="#F59E0B" fontSize="10">$12.00 - $18.00</text>
          <text x="650" y="179" fill="#9ca3af" fontSize="9">長 Context</text>

          {/* Row 5: Gemini 3 Flash */}
          <rect x="20" y="188" width="710" height="28" rx="0" fill="#1a1d27" stroke="#475569" strokeWidth="0.5" />
          <text x="40" y="207" fill="#34d399" fontSize="10" fontWeight="600">Gemini 3 Flash</text>
          <text x="280" y="207" fill="#34d399" fontSize="10">$0.50</text>
          <text x="480" y="207" fill="#34d399" fontSize="10">$3.00</text>
          <text x="650" y="207" fill="#9ca3af" fontSize="9">超平快速</text>

          {/* Row 6: DeepSeek V3.2 */}
          <rect x="20" y="216" width="710" height="28" rx="0" fill="#1a1d27" stroke="#475569" strokeWidth="0.5" />
          <text x="40" y="235" fill="#ef4444" fontSize="10" fontWeight="600">DeepSeek V3.2</text>
          <text x="280" y="235" fill="#34d399" fontSize="10">$0.28</text>
          <text x="480" y="235" fill="#34d399" fontSize="10">$0.42</text>
          <text x="650" y="235" fill="#9ca3af" fontSize="9">開源最平</text>

          {/* Separator */}
          <line x1="20" y1="256" x2="730" y2="256" stroke="#475569" strokeWidth="0.5" />

          {/* Cost comparison visual */}
          <text x="375" y="280" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="700">Output 成本對比（每 1M tokens）</text>

          {/* Bars */}
          <text x="40" y="308" fill="#a78bfa" fontSize="9">Claude Opus 4.6</text>
          <rect x="180" y="298" width="500" height="14" rx="3" fill="#7c3aed" opacity="0.8" />
          <text x="690" y="309" fill="#e2e8f0" fontSize="9">$25</text>

          <text x="40" y="330" fill="#a78bfa" fontSize="9">Claude Sonnet 4.5</text>
          <rect x="180" y="320" width="300" height="14" rx="3" fill="#8b5cf6" opacity="0.7" />
          <text x="490" y="331" fill="#e2e8f0" fontSize="9">$15</text>

          <text x="40" y="352" fill="#34d399" fontSize="9">GPT-5.2 Codex</text>
          <rect x="180" y="342" width="280" height="14" rx="3" fill="#059669" opacity="0.7" />
          <text x="470" y="353" fill="#e2e8f0" fontSize="9">$14</text>

          <text x="40" y="374" fill="#F59E0B" fontSize="9">Gemini 3 Pro</text>
          <rect x="180" y="364" width="360" height="14" rx="3" fill="#d97706" opacity="0.7" />
          <text x="550" y="375" fill="#e2e8f0" fontSize="9">$12-18</text>

          <text x="40" y="396" fill="#34d399" fontSize="9">Gemini 3 Flash</text>
          <rect x="180" y="386" width="60" height="14" rx="1" fill="#10B981" opacity="0.8" />
          <text x="250" y="397" fill="#e2e8f0" fontSize="9">$3.00</text>

          <text x="40" y="418" fill="#ef4444" fontSize="9">DeepSeek V3.2</text>
          <rect x="180" y="408" width="8" height="14" rx="1" fill="#ef4444" opacity="0.8" />
          <text x="198" y="419" fill="#e2e8f0" fontSize="9">$0.42</text>

          <text x="375" y="450" textAnchor="middle" fill="#9ca3af" fontSize="9">Opus output 成本約係 Flash 嘅 8.3 倍 — 高價模型要做 routing</text>
        </svg>
      </div>

      <ol className="steps">
        <li><span className="step-num">1</span><span><strong>API Token = 你嘅身份證 + 信用卡</strong> — 洩露咗等於俾人免費用你嘅 quota。有人試過 push key 上 GitHub，幾個鐘頭內被 bot scan 到，帳單直接爆幾千美金。呢啲錢係追唔返嘅。</span></li>
        <li><span className="step-num">2</span><span><strong>Authentication（你係邊個）vs Authorization（你可以做咩）</strong> — Authentication 驗證你嘅身份，Authorization 決定你嘅權限。API Key 通常同時做埋兩樣嘢，所以一旦洩露就雙重災難。</span></li>
        <li><span className="step-num">3</span><span><strong>Token 有 scope（讀/寫/admin）— 永遠用最小權限</strong>。如果你嘅 app 淨係需要 read，就唔好俾 write 權限。OpenAI、Anthropic 都支援 restricted API keys，用得盡用。萬一洩露，damage 都細好多。</span></li>
      </ol>
      <p className="text-xs text-text-dimmer mt-4">
        Data as of {FACT_CHECK_META.asOf}. Sources: {FACT_CHECK_META.sources.join(' / ')}. Claude Opus 4.6 cache pricing：5m write $6.25 / 1h write $10 / hit-refresh $0.50（per 1M）。
      </p>
    </div>
  );
}

function FrameworkTab() {
  return (
    <div className="card">
      <h2>5 大 API Key 保護方法</h2>
      <div className="subtitle">由本地開發到 Production，逐層保護你嘅 key</div>
      <p>API Key 安全唔係一招搞掂，而係<strong>多層防禦</strong>。由開發環境到 Production，每層都有唔同嘅最佳做法。以下 5 種方法由簡單到進階排列。</p>

      <div className="key-points">
        <div className="key-point">
          <h4>① Environment Variables (.env)</h4>
          <p><strong style={{ color: '#34d399' }}>本地開發用，記得加 .gitignore</strong>。將 key 放喺 <code>.env</code> 檔案，永遠唔好 hardcode 喺 source code 入面。<code>.env</code> 檔案一定要加入 <code>.gitignore</code>，否則 push 上 GitHub 就即刻洩露。呢個係最基本但最多人中招嘅一步。</p>
        </div>
        <div className="key-point">
          <h4>② Backend Proxy</h4>
          <p><strong style={{ color: '#ef4444' }}>Frontend 永遠唔好直接 call AI API，用 backend proxy 隱藏 key</strong>。Frontend 嘅所有 code 都係公開嘅——用 DevTools 就睇到。所以一定要用 backend server 做中間層，key 只存在 server side，frontend call 你嘅 backend endpoint。</p>
        </div>
        <div className="key-point">
          <h4>③ Cloud Secret Manager (GCP/AWS)</h4>
          <p><strong style={{ color: '#a78bfa' }}>Production 用，有 IAM + audit log</strong>。Google Secret Manager 或 AWS Secrets Manager 提供加密存儲、精細嘅 IAM 權限控制、同完整嘅 audit log。你可以追蹤邊個、幾時、喺邊度 access 過你嘅 key。</p>
        </div>
        <div className="key-point">
          <h4>④ Platform Secrets (Vercel/Railway)</h4>
          <p><strong style={{ color: '#F59E0B' }}>Serverless 部署用，UI 簡單</strong>。Vercel、Railway、Netlify 等平台都有內建嘅 Environment Variables UI。只需要喺 dashboard 設定一次，deploy 時會自動注入。適合唔想搞 cloud infra 嘅個人開發者。</p>
        </div>
        <div className="key-point">
          <h4>⑤ Key Rotation</h4>
          <p><strong style={{ color: '#34d399' }}>定期換 key，舊 key 設 expiry</strong>。即使冇洩露跡象，都應該每 30-90 日 rotate key。大部分 API provider 都支援同時有多個 active key，方便你無縫切換。Set 舊 key 嘅 expiry date，到期自動 revoke。</p>
        </div>
      </div>

      <div className="diagram-container">
        <svg viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-fw" x="-4%" y="-4%" width="108%" height="108%"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3" /></filter>
            <marker id="arrProxy" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#6366f1" /></marker>
          </defs>

          <text x="350" y="25" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="700">Backend Proxy 架構 — Frontend 永遠唔接觸 API Key</text>

          {/* Frontend */}
          <rect x="30" y="60" width="160" height="80" rx="14" fill="#1a1d27" stroke="#3B82F6" strokeWidth="2" filter="url(#shadow-fw)" />
          <text x="110" y="90" textAnchor="middle" fill="#3B82F6" fontSize="13" fontWeight="700">Frontend</text>
          <text x="110" y="110" textAnchor="middle" fill="#9ca3af" fontSize="9">React / Next.js</text>
          <text x="110" y="125" textAnchor="middle" fill="#ef4444" fontSize="9">無 API Key</text>

          {/* Arrow 1 */}
          <path d="M192,100 L268,100" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrProxy)" />
          <text x="230" y="92" textAnchor="middle" fill="#9ca3af" fontSize="8">/api/chat</text>

          {/* Backend */}
          <rect x="270" y="50" width="180" height="100" rx="14" fill="#0f3d2e" stroke="#10B981" strokeWidth="2.5" filter="url(#shadow-fw)" />
          <text x="360" y="80" textAnchor="middle" fill="#10B981" fontSize="13" fontWeight="700">Your Backend</text>
          <text x="360" y="98" textAnchor="middle" fill="#34d399" fontSize="9">API Key 安全存放</text>
          <text x="360" y="113" textAnchor="middle" fill="#9ca3af" fontSize="9">Rate Limit + Auth</text>
          <text x="360" y="128" textAnchor="middle" fill="#9ca3af" fontSize="9">Usage Tracking</text>

          {/* Arrow 2 */}
          <path d="M452,100 L528,100" fill="none" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrProxy)" />
          <text x="490" y="92" textAnchor="middle" fill="#9ca3af" fontSize="8">Bearer token</text>

          {/* AI API */}
          <rect x="530" y="60" width="140" height="80" rx="14" fill="#3d2e0a" stroke="#F59E0B" strokeWidth="2" filter="url(#shadow-fw)" />
          <text x="600" y="90" textAnchor="middle" fill="#F59E0B" fontSize="13" fontWeight="700">AI API</text>
          <text x="600" y="110" textAnchor="middle" fill="#9ca3af" fontSize="9">OpenAI / Anthropic</text>
          <text x="600" y="125" textAnchor="middle" fill="#9ca3af" fontSize="9">Google / etc.</text>

          <text x="350" y="180" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="600">User 永遠接觸唔到 API Key — 就算 inspect network request 都睇唔到</text>
        </svg>
      </div>

      <div className="use-case">
        <h4>防禦層級建議</h4>
        <p>個人 side project → .env + Platform Secrets 就夠。<br />
        有 user 嘅 app → 一定要 Backend Proxy + Rate Limit。<br />
        Production / 企業 → Cloud Secret Manager + Key Rotation + Audit Log 全套。</p>
      </div>
    </div>
  );
}

function PracticeTab() {
  return (
    <div className="card">
      <h2>實戰練習：3 個 Hands-on Exercises</h2>
      <div className="subtitle">跟住步驟做，由零開始保護你嘅 API Key</div>

      <ol className="steps">
        <li>
          <span className="step-num">1</span>
          <span>
            <strong style={{ color: '#34d399' }}>Exercise 1：.env + .gitignore Setup</strong><br />
            <strong>Step 1</strong>：喺 project root 建立 <code>.env</code> 檔案：<br />
            <code style={{ display: 'block', background: '#1a1d27', padding: '8px 12px', borderRadius: 8, margin: '8px 0', fontSize: 13 }}>
              OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx<br />
              ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
            </code>
            <strong>Step 2</strong>：喺 <code>.gitignore</code> 加入：<br />
            <code style={{ display: 'block', background: '#1a1d27', padding: '8px 12px', borderRadius: 8, margin: '8px 0', fontSize: 13 }}>
              .env<br />
              .env.local<br />
              .env.production
            </code>
            <strong>Step 3</strong>：建立 <code>.env.example</code>（template 俾其他人參考，唔放真 key）：<br />
            <code style={{ display: 'block', background: '#1a1d27', padding: '8px 12px', borderRadius: 8, margin: '8px 0', fontSize: 13 }}>
              OPENAI_API_KEY=your-key-here<br />
              ANTHROPIC_API_KEY=your-key-here
            </code>
            <strong>Step 4</strong>：驗證 — 行 <code>git status</code> 確認 <code>.env</code> 冇出現喺 tracked files。
          </span>
        </li>
        <li>
          <span className="step-num">2</span>
          <span>
            <strong style={{ color: '#a78bfa' }}>Exercise 2：Backend Proxy for AI API Calls</strong><br />
            <strong>FastAPI 版本：</strong><br />
            <code style={{ display: 'block', background: '#1a1d27', padding: '8px 12px', borderRadius: 8, margin: '8px 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>
{`# main.py
from fastapi import FastAPI, HTTPException
from anthropic import Anthropic
import os

app = FastAPI()
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

@app.post("/api/chat")
async def chat(request: dict):
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=request["messages"]
        )
        return {"content": response.content[0].text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))`}
            </code>
            <strong>Express 版本：</strong><br />
            <code style={{ display: 'block', background: '#1a1d27', padding: '8px 12px', borderRadius: 8, margin: '8px 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>
{`// server.js
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

app.post('/api/chat', async (req, res) => {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: req.body.messages
    });
    res.json({ content: response.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});`}
            </code>
            重點：Frontend 只 call <code>/api/chat</code>，永遠唔知道 actual API key。
          </span>
        </li>
        <li>
          <span className="step-num">3</span>
          <span>
            <strong style={{ color: '#F59E0B' }}>Exercise 3：Monthly Cost Calculation</strong><br />
            <strong>場景：</strong>你嘅 app 每日有 1,000 個用戶，每人平均發 5 條 message。每條 message 平均 input 500 tokens、output 800 tokens。<br /><br />
            <strong>每月 token 用量：</strong><br />
            Input：1,000 users x 5 msg x 500 tokens x 30 days = <strong>75M tokens</strong><br />
            Output：1,000 users x 5 msg x 800 tokens x 30 days = <strong>120M tokens</strong><br /><br />
            <strong>月費對比：</strong><br />
            <code style={{ display: 'block', background: '#1a1d27', padding: '8px 12px', borderRadius: 8, margin: '8px 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>
{`Claude Opus 4.6:  75 x $5  + 120 x $25    = $375   + $3,000  = $3,375/月
Claude Sonnet 4.5: 75 x $3  + 120 x $15   = $225   + $1,800  = $2,025/月
GPT-5.2 Codex:   75 x $1.75 + 120 x $14   = $131   + $1,680  = $1,811/月
Gemini 3 Pro:    75 x $4   + 120 x $18    = $300   + $2,160  = $2,460/月
Gemini 3 Flash:  75 x $0.50 + 120 x $3.00 = $37.50 + $360    = $397.50/月
DeepSeek V3.2:   75 x $0.28 + 120 x $0.42 = $21    + $50.40  = $71.40/月`}
            </code>
            <strong style={{ color: '#ef4444' }}>Opus 比 Flash 貴約 8.5 倍</strong>。所以真實 production 通常會用 routing：簡單問題用 Flash，複雜問題先升級用 Opus。呢個叫做 <strong>model routing / cascading</strong>。DeepSeek V3.2 喺成本上仍然極有優勢，適合大流量任務。
          </span>
        </li>
      </ol>

      <div className="use-case">
        <h4>成本控制黃金法則</h4>
        <p>① 80% 嘅 request 用最平嘅模型就夠（Flash / Haiku）<br />
        ② 設 hard spending limit 喺 API dashboard<br />
        ③ 加 rate limit 防止單一用戶濫用<br />
        ④ Monitor daily usage，有 spike 即 alert</p>
      </div>
    </div>
  );
}

function AIViberTab() {
  return (
    <div className="card">
      <h2>AI Viber</h2>
      <div className="subtitle">複製 Prompt，貼去 AI 工具，即刻估成本同審計安全</div>

      <div className="prompt-card">
        <h4>Prompt 1 — Cost Calculator</h4>
        <div className="prompt-text">
          {`你係一個 AI API 成本計算專家。幫我估算以下使用場景嘅月費：

我嘅 App 情況：
- 每日活躍用戶：[填數字，例如：500]
- 每個用戶平均每日 request 數：[例如：10]
- 平均每個 request 嘅 input tokens：[例如：800]
- 平均每個 request 嘅 output tokens：[例如：1200]
- 需要嘅能力：[例如：一般對話 / 代碼生成 / 長文分析]

請你：
1. 計算每月總 token 用量（input + output 分開算）
2. 用以下模型計算月費：
   - Claude Opus 4.6 ($5/$25 per 1M)
   - Claude Sonnet 4.5 ($3/$15 per 1M)
   - GPT-5.2 Codex ($1.75/$14 per 1M)
   - Gemini 3 Pro ($4/$18 per 1M)
   - Gemini 3 Flash ($0.50/$3.00 per 1M)
   - DeepSeek V3.2 ($0.28/$0.42 per 1M)
3. 建議最佳嘅 model routing 策略（邊啲 request 用平模型，邊啲用貴模型）
4. 預估用 routing 策略後嘅實際月費（通常慳 60-80%）`}
        </div>
      </div>

      <div className="prompt-card">
        <h4>Prompt 2 — Security Audit</h4>
        <div className="prompt-text">
          {`你係一個 API Key 安全審計專家。我將以下代碼 / 設定貼俾你，請幫我搵出所有 API key 洩露風險：

[貼你嘅代碼 / config / .env 設定 / docker-compose.yml / CI/CD config]

請你檢查：
1. 有冇 hardcoded API key 喺 source code 入面
2. .env 有冇加入 .gitignore
3. Frontend code 有冇直接引用 API key（即使係 NEXT_PUBLIC_ 或 VITE_ prefix）
4. Docker / CI config 有冇暴露 secrets
5. 有冇用 backend proxy 保護 key

對每個發現嘅問題：
- 風險等級（Critical / High / Medium / Low）
- 具體嘅修復步驟
- 修復後嘅 code example`}
        </div>
      </div>
    </div>
  );
}

function QuizTab() {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const questions = [
    { id: 1, q: '以下邊個做法最危險？', options: ['將 API Key 存喺 .env 檔案', '將 API Key hardcode 喺 frontend JavaScript', '將 API Key 存喺 Cloud Secret Manager', '用 backend proxy 隱藏 API Key'], correct: 1 },
    { id: 2, q: 'Authentication 同 Authorization 嘅分別係咩？', options: ['一樣嘅嘢，只係叫法唔同', 'Authentication 驗證身份，Authorization 決定權限', 'Authentication 決定權限，Authorization 驗證身份', '兩者都同 API Key 無關'], correct: 1 },
    { id: 3, q: '如果你嘅 app 用 Claude Opus 4.6 處理每月 100M output tokens，月費大約幾多？', options: ['$500', '$2,500', '$7,500', '$25,000'], correct: 1 },
    { id: 4, q: '以下邊個係正確嘅 API Key 保護策略？', options: ['Frontend 直接 call OpenAI API，用 HTTPS 就安全', '將 key 存喺 localStorage 加密', '用 backend proxy，key 只存 server side', '將 key base64 encode 放喺 frontend'], correct: 2 },
    { id: 5, q: 'Key Rotation 嘅建議頻率係幾多？', options: ['只要冇洩露就唔使換', '每 30-90 日', '每年一次', '每次 deploy 都換'], correct: 1 },
  ];

  const score = submitted ? questions.filter((q) => answers[q.id] === q.correct).length : 0;

  return (
    <div className="card">
      <h2>小測驗</h2>
      <div className="subtitle">測試你對 API Token 安全同成本嘅理解</div>
      {questions.map((q) => (
        <div key={q.id} style={{ marginBottom: 20 }}>
          <p><strong>{q.id}. {q.q}</strong></p>
          {q.options.map((opt, i) => (
            <label key={i} style={{ display: 'block', padding: '4px 0', cursor: 'pointer', color: submitted ? (i === q.correct ? '#34d399' : answers[q.id] === i ? '#ef4444' : '#9ca3af') : '#e2e8f0' }}>
              <input type="radio" name={`q${q.id}`} disabled={submitted} checked={answers[q.id] === i} onChange={() => setAnswers({ ...answers, [q.id]: i })} style={{ marginRight: 8 }} />
              {opt}
            </label>
          ))}
        </div>
      ))}
      {!submitted ? (
        <button onClick={() => setSubmitted(true)} className="quiz-submit-btn" style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 14 }}>提交</button>
      ) : (
        <div style={{ padding: 16, borderRadius: 12, background: score >= 4 ? '#0f3d2e' : '#3d2e0a', border: `1px solid ${score >= 4 ? '#34d399' : '#F59E0B'}` }}>
          <strong>{score}/5</strong> — {score >= 4 ? '勁！你對 API Token 安全嘅理解好紮實。' : '建議重溫上面嘅內容，特別係 Backend Proxy 同 Cost Calculation 部分。'}
        </div>
      )}
    </div>
  );
}

export default function APITokenSecurity() {
  return (
    <>
      <TopicTabs
        title="API Token 安全與成本"
        subtitle="保護你嘅 API Key，控制你嘅 AI 帳單 — 工程師必修課"
        tabs={[
          { id: 'overview', label: '① 概念', content: <OverviewTab /> },
          { id: 'framework', label: '② 框架', content: <FrameworkTab /> },
          { id: 'practice', label: '③ 實戰', premium: true, content: <PracticeTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
          { id: 'quiz', label: '⑤ 小測', premium: true, content: <QuizTab /> },
        ]}
      />
      <div className="topic-container">
        <RelatedTopics topics={relatedTopics} />
      </div>
    </>
  );
}
