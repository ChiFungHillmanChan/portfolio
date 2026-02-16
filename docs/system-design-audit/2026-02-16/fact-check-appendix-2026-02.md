# 2026-02 事實核對附錄（官方來源版）

- 核對基準日：2026-02-16
- 核對原則：官方文件 > 官方 pricing > 其他來源
- Verdict 用語：`Verified` / `Needs Update` / `Unverifiable`

## A) 官方來源清單

### AI 模型與 API
- OpenAI Pricing：<https://platform.openai.com/docs/pricing>
- OpenAI Models：<https://platform.openai.com/docs/models/gpt-5.2>
- OpenAI Function Calling：<https://platform.openai.com/docs/guides/function-calling>
- OpenAI GPTs / Plugin 過渡：<https://openai.com/index/introducing-gpts/>
- Anthropic Pricing：<https://docs.anthropic.com/en/docs/about-claude/pricing>
- Anthropic Models Overview：<https://docs.anthropic.com/en/docs/about-claude/models/overview>
- Gemini API Models：<https://ai.google.dev/gemini-api/docs/models>
- Gemini API Pricing：<https://ai.google.dev/gemini-api/docs/pricing>
- DeepSeek Docs（Overview）：<https://api-docs.deepseek.com/>
- DeepSeek Pricing：<https://api-docs.deepseek.com/quick_start/pricing/>

### MCP / 協議
- MCP Introduction：<https://modelcontextprotocol.io/introduction>
- MCP Spec（2025-11-05）：<https://modelcontextprotocol.io/specification/2025-11-05>

### 平台與部署
- Vercel Pricing：<https://vercel.com/pricing>
- Railway Pricing：<https://railway.com/pricing>
- Supabase Pricing：<https://supabase.com/pricing>
- Supabase Usage Docs：<https://supabase.com/docs/guides/platform/manage-your-usage>
- Render Pricing：<https://render.com/pricing>
- Firebase Pricing：<https://firebase.google.com/pricing>
- Firebase App Hosting Costs：<https://firebase.google.com/docs/app-hosting/costs>
- ngrok Pricing：<https://ngrok.com/pricing>
- Cloudflare Tunnel（Named Tunnel）：<https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/>
- Cloudflare Quick Tunnels：<https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/>

## B) 高影響核對結果

### B1. OpenAI（模型命名與 pricing）
- `Verified`：OpenAI pricing 頁面有現行模型與 token 定價。
- `Needs Update`：內容中大量「GPT-5.3 Codex」命名，需對齊官方當前命名（例如 GPT-5.2 / 5.1 系列）。
- 影響檔案：
  - `topics/AIModelComparison.jsx`
  - `topics/AIToolsLandscape.jsx`
  - `topics/APITokenSecurity.jsx`
  - `data/content/ai-basics-start-here.json`
  - `data/topics.json`

### B2. Anthropic（Opus/Sonnet 版本、context）
- `Verified`：Sonnet 4.5 pricing（$3 input / $15 output）可核實。
- `Verified`：Models overview 指出 Opus 4.1、Sonnet 4.5，並提到 Sonnet extended thinking 1M context（beta）。
- `Needs Update`：內容寫「Opus 4.6 + 1M beta」屬版本與能力錯配。
- 影響檔案：
  - `topics/AIModelComparison.jsx`
  - `topics/AIToolsLandscape.jsx`
  - `topics/APITokenSecurity.jsx`

### B3. Gemini（2.5 系列）
- `Verified`：Gemini API docs 主線為 2.5 系列（Pro / Flash / Flash-Lite）。
- `Needs Update`：內容大量寫 Gemini 3；pricing 亦沿用舊價。
- 影響檔案：
  - `topics/AIModelComparison.jsx`
  - `topics/AIToolsLandscape.jsx`
  - `topics/APITokenSecurity.jsx`
  - `data/content/ai-basics-start-here.json`

### B4. DeepSeek（價格與上下文存在官方頁面差異）
- `Verified`：官方 pricing 有列 DeepSeek 模型定價。
- `Needs Update`：同時發現 docs 不同頁對 V3.2-Exp 價格/context 有差異（需綁定模型版本與頁面）。
- 建議：內容寫法改成「模型版本 + asOf + 官方鏈接」，避免單一硬值。
- 影響檔案：
  - `topics/AIModelComparison.jsx`
  - `topics/APITokenSecurity.jsx`
  - `topics/OpenSourceAI.jsx`

### B5. MCP / Plugin / Function Calling
- `Verified`：MCP 官方規格存在、並有版本化 spec。
- `Verified`：OpenAI function calling 仍是主流機制。
- `Needs Update`：內容將 OpenAI Plugins 當現行主線，需改為 GPTs/Actions 歷史背景 + 現行 function calling + MCP 對照。
- 影響檔案：
  - `topics/MCPProtocol.jsx`
  - `data/coachingPrompts.js`

### B6. 部署平台（高波動）
- `Verified`：Vercel Pro $20/seat（月）
- `Needs Update`：Railway 文案仍有「Trial $5 credit + 500hrs」舊描述，現行 pricing 主線已變。
- `Needs Update`：Render 免費層細節可能過時；需以 pricing page 為準。
- `Verified`：Firebase App Hosting 需 Blaze plan。
- `Verified`：ngrok 有 Free / Hobby / Pay-as-you-go。
- `Verified`：Cloudflare Tunnel / Quick Tunnel 可免費起步。
- 影響檔案：
  - `topics/Deployment.jsx`
  - `topics/LocalhostHosting.jsx`

## C) Verdict 分佈（curated claim registry）

來源：`docs/system-design-audit/2026-02-16/claims-registry.json`

- `Verified`：9
- `Needs Update`：23
- `Unverifiable`：3

> 重點：`Needs Update` 主要集中喺 AI Core 內容，且多數係「版本名 + pricing + context」硬編造成。

## D) 立即改寫規則（內容層）

1. 所有模型名加 `asOf: 2026-02-16`。
2. 價格改為「區間 + source link + 更新日期」。
3. 任何「最強 / 最平 / 王者」句式，必須加「適用場景與限制」。
4. 所有部署配額改成「以官方 pricing 為準」並提供外鏈。
5. 對「Unverifiable」聲稱（例如 stars、未有官方證據）先移除。

## E) 高優先更新檔案（按商業影響）

1. `topics/AIModelComparison.jsx`
2. `topics/APITokenSecurity.jsx`
3. `topics/AIToolsLandscape.jsx`
4. `topics/OpenSourceAI.jsx`
5. `topics/MCPProtocol.jsx`
6. `topics/Deployment.jsx`
7. `data/content/ai-basics-start-here.json`
8. `data/topics.json`
9. `data/coachingPrompts.js`
