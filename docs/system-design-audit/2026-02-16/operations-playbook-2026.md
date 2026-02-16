# 長期內容運營流程（2026 版）

- 目的：確保 system-design 內容持續「準確、可賣、可維護」
- 範圍：`portfolio/src/game/system-design/src`

## 1) 角色與責任

- Content Owner：定義課程結構、決定章節優先級
- Fact Checker：核對模型/價格/平台配額
- Engineering Owner：落地 schema/工具腳本/渲染改動
- QA Owner：驗證路由、quiz、premium gate、鏈接有效性

## 2) 更新節奏（SLA）

### 每月（必做）
1. 跑 audit 腳本：
   - `node scripts/system-design/generate_audit_artifacts.mjs`
2. 更新 claim verdict：
   - `docs/system-design-audit/2026-02-16/claims-registry.json`
3. 發佈 changelog：
   - 新增/更改/刪除 claims
   - 哪些 topic 已重新核實

### 每季（深度）
1. 全量課程重審（教學設計 + quiz + 變現）
2. 將高風險 topic 做二次重寫
3. 更新 bundle 與定價策略

### 即時（事件驅動）
- 發生以下事件要 48 小時內更新：
  - 官方模型大版本切換
  - 官方 pricing 重大調整
  - 協議規格更新（MCP / function calling）

## 3) 標準工作流（MCP / Web Verification Loop）

1. 偵測：從 `claims-raw-extract.json` 找高風險 claim
2. 核對：只查官方來源
3. 判定：`Verified / Needs Update / Unverifiable`
4. 修文：改內容 + 補 asOf + 補 source link
5. 回歸：build + route + quiz smoke
6. 發佈：更新 changelog

## 4) 內容格式規範（付費級）

每個主題固定輸出：
- 學習目標
- 實戰流程
- 常見錯誤
- 下一步
- 小測驗
- 最新核實日期 + 來源

## 5) Data Contract（建議固定）

### topic verification
檔案：`data/topicVerification.json`
- `slug`
- `lastVerifiedAt`
- `verificationLevel`
- `sources[]`
- `contentFreshnessDays`
- `premiumValueScore`

### claim registry
檔案：`docs/system-design-audit/<date>/claims-registry.json`
- `id`
- `file`, `line`
- `claim`
- `claimType`
- `verdict`
- `checkDate`
- `sourceUrls[]`
- `notes`

## 6) 品質閾值（Quality Gates）

- QG-1：高時效段落必須有 `asOfDate`
- QG-2：高風險 topic 必須有官方來源連結
- QG-3：premium topic 必須有 quiz + 模板 + 反例
- QG-4：所有價格必須來自配置層或 registry，不可散落硬編

## 7) 監控指標

- freshness coverage（有日期的高時效段落比例）
- verified ratio（claim registry 內 Verified 比例）
- quiz readiness（ready topic 比例）
- premium conversion（free->standard, standard->pro）
- retention（D7 / D30）

## 8) 事故處理（Content Incident）

### 定義
- 用戶回報內容過期或錯誤，影響購買決策

### 流程
1. 24 小時內標記為「待核實」
2. 48 小時內完成官方核對
3. 發佈修正與變更說明
4. 追蹤是否屬系統性問題（流程或工具缺失）

## 9) 推薦自動化下一步

1. 加一個 `npm run audit:system-design` 指令包裝現有腳本
2. 每月 CI 產生 artifact 並保存
3. 對 `claims-registry.json` 做 schema 驗證

