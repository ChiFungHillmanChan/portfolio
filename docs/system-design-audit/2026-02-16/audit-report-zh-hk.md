# System Design 內容 2026-02 全面審核主報告（`src` 範圍）

- 審核日期：2026-02-16
- 審核範圍：`portfolio/src/game/system-design/src`
- 審核模式：Software Engineer + AI Engineer + Prompt Engineer 三重視角
- 事實核對策略：官方一手來源優先（OpenAI / Anthropic / Google Gemini / DeepSeek / MCP / 官方平台 pricing）

## 1) 管理層摘要（Executive Summary）

### 結論
依家套內容已經有清晰課程骨架同 premium 分層，但未達到「可長期收費」標準。最大風險唔係 UI，而係 **時效資料老化 + Quiz 覆蓋不足 + 教學驗收框架唔夠工程化**。

### 核心數據（全量掃描）
- Topics：67（Premium：12）
- Pages：8（Welcome / TopicPage / Roadmap / AIPlanner / Coaching / Projects / Premium / Settings）
- Components：15
- Data files：5
- 可疑時效 claim 行數：600 行
- 高風險 topic：8（集中喺 AI Core + 部署）
- Quiz 狀態：`ready=5`、`empty=38`、`no-quizrenderer=24`
- 教學框架訊號平均分：`1.37/4`（多數頁面冇明確「學習成果/下一步/驗收」）

### 商業化判斷
- 可以收費：有機會，但要先做 P0 清理（內容可信度）
- 未處理前風險：用戶一對比官方 docs，會即時覺得資料過期
- 建議：先做「可信度修復 Sprint」（2-3 週）再推廣

## 2) 審核方法與證據

### 內容審核流程
1. 先做全量檔案盤點（topics/pages/components/data）
2. 抽取高時效 claim（模型、版本、價格、context、部署配額）
3. 逐條對官方來源做 verdict：`Verified / Needs Update / Unverifiable`
4. 做教學設計評分（學習成果、流程、誤區、下一步）
5. 做 quiz 可用性審核（是否存在、是否有題、是否可評分）

### 自動化產物
- `docs/system-design-audit/2026-02-16/content-matrix.json`
- `docs/system-design-audit/2026-02-16/quiz-audit.json`
- `docs/system-design-audit/2026-02-16/claims-raw-extract.json`
- `docs/system-design-audit/2026-02-16/claims-registry.json`
- `docs/system-design-audit/2026-02-16/topic-audit-table.md`
- `docs/system-design-audit/2026-02-16/page-audit-table.md`

## 3) 全頁面審核（8 pages）

頁面完整覆蓋結果：見 `docs/system-design-audit/2026-02-16/page-audit-table.md`

### 逐頁重點
- `pages/Welcome.jsx`
  - 優點：入口清楚，路徑導流明確
  - 問題：AI 基礎入口文案仍有版本舊稱（13/14 主題敘述要同步）
- `pages/TopicPage.jsx`
  - 優點：premium page-level gate 做得正確，lazy chunk 未授權時不渲染
  - 問題：內容 freshness 無 metadata 顯示
- `pages/Roadmap.jsx`
  - 優點：學習順序可視化好
  - 問題：節點缺 freshness / verified 標記
- `pages/AIPlanner.jsx`
  - 優點：有週限制與進度同步
  - 問題：冇顯示課題內容版本日期，計劃生成未綁定 claim freshness
- `pages/Coaching.jsx`
  - 優點：互動流程完整、trial gate 清楚
  - 問題：教練 prompt 以前係 free-text，無結構化驗收（已做結構化改造）
- `pages/Projects.jsx`
  - 優點：有 keyword + AI 評語雙層評估
  - 問題：評估規則同正式課程學習目標未對齊
- `pages/Premium.jsx`
  - 優點：方案層級清楚
  - 問題：商業文案與價格原本硬編，變更成本高（已抽離部分配置）
- `pages/Settings.jsx`
  - 優點：admin panel + plan 管理完整
  - 問題：價格字串重覆出現，容易 drift（已改為取配置）

## 4) 全 Topic 審核（67 topics）

全量 topic 審核明細：`docs/system-design-audit/2026-02-16/topic-audit-table.md`

### 分類健康度
- `ai-core`：15 課，時效命中 509（最高風險區）
- `network`：8 課，含部署/本地分享，受平台 pricing 變動影響
- `deploy`：1 課，但時效命中高（平台免費配額變更快）
- 其他分類（career/engineering/storage/app/security）工程概念較穩定，但 quiz 覆蓋依然不足

### 高風險 Top 8（需優先更新）
1. `ai-model-comparison`
2. `api-token-security`
3. `localhost-hosting`
4. `ai-tools-landscape`
5. `open-source-ai`
6. `mcp-protocol`
7. `deployment`
8. `multi-ai-workflow`

## 5) Quiz 系統審核

### 實際狀態
- `ready`：5
- `empty-quiz`：38
- `no-quizrenderer`：24

### 已落地修復
- 修正 4 個 prop mismatch（`quizData` -> `data`）
  - `topics/KeyValueStore.jsx`
  - `topics/LargeAPIResponse.jsx`
  - `topics/LocalhostHosting.jsx`
  - `topics/MessageQueue.jsx`
- `components/QuizRenderer.jsx` 已加 backward-compatible：同時接受 `data` / `quizData`

### 未完成缺口
- 38 個 topic 仍係空 quizData
- 24 個 topic 未掛載 quiz renderer
- 建議每課最少 5 題（概念 2 + 設計 2 + 反例 1）

## 6) 三重教練視角評語

### A. Software Engineer 視角
- 強項：系統設計主題廣、結構清楚
- 弱項：缺版本化資訊、缺「何時不適用」說明
- 必做：每課加入「適用邊界」「反例」「生產風險」

### B. AI Engineer 視角
- 強項：覆蓋模型選型、workflow、token security、MCP
- 弱項：大量數值/版本硬編，更新節奏追唔上官方
- 必做：將 pricing/model/context 改做動態 registry + asOf 日期

### C. Prompt Engineer 視角
- 強項：prompt 類內容多，練習導向好
- 弱項：舊版 prompt 無結構 schema，評估難
- 已做：`coachingPrompts.js` 改為結構化（`goal/inputs/expectedOutput/failureMode/evalChecklist`）

## 7) P0 / P1 / P2 問題分級

### P0（立即修）
- AI 型號與定價大量過期（見 `claims-registry.json`）
- 首頁 AI 入口與課程摘要出現舊型號名
- 部署平台配額/方案資料有時效風險

### P1（2-4 週）
- Quiz 覆蓋不足，學習閉環不完整
- 每課缺「學習成果 + 常見錯 + 下一步」結構
- Premium 內容價值點需要更可交付（模板 +決策表+案例）

### P2（持續優化）
- 引入 freshness badge、來源顯示、最後核實日期
- 建立每月自動巡檢與季度人工審核

## 8) 已實作變更（今次落地）

### 工程變更
- `components/QuizRenderer.jsx`
  - 支援 `data` / `quizData` 雙 prop，防止舊頁面靜默失效
- 4 個 topic 的 QuizRenderer 呼叫統一改為 `data`
- `data/coachingPrompts.js`
  - 由純字串升級為結構化 prompt 規格
- `pages/Coaching.jsx`
  - 新增對結構化 prompt 的兼容讀取
- `data/premiumPlans.js`（新增）
  - 價格/方案文案配置化
- `pages/Premium.jsx`、`components/PremiumGate.jsx`、`pages/Settings.jsx`
  - 部分價格與文案改為讀取配置
- `data/topicVerification.json`（新增）
  - topic metadata 擴充骨架（lastVerifiedAt / verificationLevel / sources / freshness）
- `scripts/system-design/generate_audit_artifacts.mjs`（新增）
  - 可重跑生成 matrix / quiz / claim 抽取

### 驗證
- `npm run build`：成功

## 9) 風險與決策建議

### 主要風險
- 若唔先處理時效 claim，付費信任會受損
- 若唔補 quiz，學習產品會被視為「只讀內容」
- 若 pricing 文案繼續散落，多處 copy 一齊過期

### 建議決策（立即）
1. 先做 AI + Deployment 的 claim refresh（P0）
2. 同步上 freshness badge（asOfDate + source）
3. 補齊 AI core + network 高流量 topic 的 quiz
4. 每月一次官方來源巡檢（固定週期）

## 10) 交付清單（已產出）

- 主報告：`docs/system-design-audit/2026-02-16/audit-report-zh-hk.md`
- 事實附錄：`docs/system-design-audit/2026-02-16/fact-check-appendix-2026-02.md`
- 變現藍圖：`docs/system-design-audit/2026-02-16/monetization-blueprint-zh-hk.md`
- 工程 backlog：`docs/system-design-audit/2026-02-16/engineering-backlog-2026-02.md`
- 運營流程：`docs/system-design-audit/2026-02-16/operations-playbook-2026.md`
- Claim registry：`docs/system-design-audit/2026-02-16/claims-registry.json`
- Raw claim extract：`docs/system-design-audit/2026-02-16/claims-raw-extract.json`
- Topic matrix：`docs/system-design-audit/2026-02-16/content-matrix.json`
- Topic 全量表：`docs/system-design-audit/2026-02-16/topic-audit-table.md`
