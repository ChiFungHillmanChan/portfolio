# 工程修復 Backlog（P0 / P1 / P2）

- 版本：2026-02
- 範圍：`portfolio/src/game/system-design/src`
- 目標：令內容達到「可收費 + 可驗證 + 可維護」

## P0（即刻做，1-2 週）

### P0-1 高風險 AI claim 更新
- 涉及檔案：
  - `topics/AIModelComparison.jsx`
  - `topics/AIToolsLandscape.jsx`
  - `topics/APITokenSecurity.jsx`
  - `topics/OpenSourceAI.jsx`
  - `topics/MCPProtocol.jsx`
  - `data/content/ai-basics-start-here.json`
  - `data/topics.json`
- 任務：
  - 將舊版本命名改為現行官方命名
  - pricing 改成「區間 + asOf + 來源連結」
  - 對 `Unverifiable` claim 先刪或降級成「示例」
- 驗收：
  - 所有高時效段落有 `asOfDate`
  - `claims-registry.json` 中 P0 claim 全部不是 `Needs Update`

### P0-2 部署平台內容去硬編
- 涉及檔案：
  - `topics/Deployment.jsx`
  - `topics/LocalhostHosting.jsx`
- 任務：
  - 配額與方案改成「官方鏈接 + 摘要」
  - 對快速變動數值加「以官方 pricing 為準」
- 驗收：
  - 平台數值唔再散落硬編
  - 所有平台都附官方 URL

### P0-3 Freshness metadata 打底
- 涉及檔案：
  - `data/topicVerification.json`（已新增骨架）
  - `data/topics.json`（建議加可對應欄位或映射）
- 任務：
  - 每個 topic 填寫 `lastVerifiedAt` / `verificationLevel`
- 驗收：
  - 67 topics metadata 完整

## P1（2-4 週）

### P1-1 Quiz 覆蓋修復
- 現況：`ready=5 / empty=38 / no-quizrenderer=24`
- 任務：
  - 每個 topic 補至少 5 題
  - 題型結構：概念、場景選型、反例、成本、故障
- 驗收：
  - `ready >= 40`（第一期）
  - 每題有 explanation

### P1-2 教學框架標準化
- 任務：每個 topic 加 4 段固定結構
  1. 你會學到咩
  2. 典型 workflow
  3. 常見錯誤
  4. 下一步
- 驗收：
  - 教學訊號平均分由 `1.37/4` 升到 `>= 2.6/4`

### P1-3 Premium 價格/文案配置化（續）
- 已做：`data/premiumPlans.js` + 部分頁面改造
- 任務：
  - 檢查全部 price 文案是否都改由配置讀取
  - 後台與前台保持同一來源
- 驗收：
  - 搜尋 `HK$` 不再有策略性硬編（除描述文本）

## P2（持續）

### P2-1 自動巡檢流水線
- 任務：
  - 用 `scripts/system-design/generate_audit_artifacts.mjs` 每月跑一次
  - 產生 diff 報告（本月 vs 上月）
- 驗收：
  - 每月自動生成 `content-matrix.json` + `claims-registry.json`

### P2-2 教練與課程一致性檢查
- 任務：
  - `coachingPrompts.js` 結構化欄位與課程主題同步
  - 抽樣測試 coaching 輸出是否符合 `evalChecklist`
- 驗收：
  - 每個 AI 核心 topic 至少 1 個 golden prompt case

### P2-3 轉化實驗
- 任務：
  - Premium Gate 文案 A/B
  - bundle 排序 A/B
- 驗收：
  - 轉換率與完成率有統計改善

## 已完成項（本次）

- ✅ QuizRenderer 接口兼容（`data` / `quizData`）
- ✅ 4 個 topic prop mismatch 修復
- ✅ coaching prompt 結構化（含 `goal/inputs/expectedOutput/failureMode/evalChecklist`）
- ✅ premium 文案/價格配置化第一階段（`premiumPlans.js`）
- ✅ topic verification metadata skeleton（`topicVerification.json`）
- ✅ audit 自動化腳本與報告產物落地

## 測試清單（回歸）

### 內容與渲染
- `npm run build` 必須成功
- 8 個 route 可正常進入
- premium/non-premium gate 正常

### 數據完整性
- `topics.json` 67 個 slug 都有 component
- claim registry 可 parse
- topic verification 67 筆

### Quiz 行為
- 有題目 topic：可答題、顯示解釋、顯示總分
- 無題目 topic：不報錯，正常 fallback

