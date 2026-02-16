# 變現升級藍圖（粵語付費內容版）

- 文件版本：2026-02
- 目標：將現有 system-design 課程升級到「可持續收費 + 可續費 + 可口碑擴散」

## 1) 當前變現狀態

### 已有基礎
- 已有 Premium Gate、Pricing Page、Standard/Pro 區分
- 已有 AI 教練 / AI Planner / Projects 實戰入口
- 已有 12 個 premium topics

### 主要問題
- 高時效內容未版本化，信任成本高
- Quiz 與學習驗收薄弱，難形成「完成感」
- Premium 價值主張偏描述性，缺「可交付輸出」

## 2) 收費價值階梯（Value Ladder）

### Tier A：Free（Lead Magnet）
- 目標：收集高質流量 + 建立信任
- 內容：
  - 基礎 topic（但加 freshness badge）
  - 每課 1 題 sample quiz
  - 每週 1 次 AI coach 試用
- 成功指標：
  - 首課完成率
  - Free -> Standard 轉換率

### Tier B：Standard（核心收入）
- 目標：賣「可直接提升工作效率」
- 內容交付（必須明確）：
  - 完整 Quiz（每課 >= 5 題）
  - Prompt 模板包（帶輸入欄位 + 輸出格式 + 反例）
  - AI workflow playbook（Research->Build->Review）
  - 每月一次內容更新摘要
- 定價策略：
  - 繼續可用一次性，但要加「更新服務級別」聲明

### Tier C：Pro（高客單價）
- 目標：賣「實戰落地 + 持續陪跑」
- 內容交付：
  - 進階實戰項目（含評分 rubric）
  - 深入案例（成本估算、容錯策略、遷移方案）
  - 高級 coaching 模式（更高每日 quota + 專題 drill）
  - 新課題優先與 changelog 提早版

## 3) 產品包裝方式（Bundle）

### Bundle 1：AI Engineer Growth Pack
- 包含：
  - `ai-tools-landscape`
  - `ai-model-comparison`
  - `api-token-security`
  - `multi-ai-workflow`
  - `ai-evaluation-loop`
- 賣點：模型選型 + 成本控制 + 量化評估

### Bundle 2：Prompt Engineer Pack
- 包含：
  - `prompt-engineering`
  - `prompt-cheat-sheet`
  - `context-rot-solution`
  - `sdd-spec-driven-development`
- 賣點：可重複、可測試、可回歸嘅 prompt 生產線

### Bundle 3：System Design Interview Pack
- 包含：
  - `mock-design`
  - `projects`（challenge）
  - `star-method`
  - `coding-interview`
- 賣點：面試表現提升可量化

## 4) 內容商品化規格（Paid-worthy Format）

每個 premium topic 統一格式：
1. 學習成果（你學完可做到咩）
2. 實戰流程（Step-by-step）
3. 常見錯誤（反例）
4. 交付模板（可直接 copy）
5. Quiz + 評分解釋
6. 下一步（關聯章節 + 實戰任務）

> 冇以上 6 件套，就唔算「付費級」。

## 5) 信任機制（用嚟支持收費）

### 內容可信度欄
每頁頂部顯示：
- `Last verified: YYYY-MM-DD`
- `Sources: 官方連結`
- `Freshness SLA: 每月檢查`

### Model/Pricing 卡片規格
- 禁止硬編單一數值
- 顯示：區間、asOf、官方來源
- 一鍵跳轉官方 docs

### 變更透明
- 每月發布 changelog
- 標記「今月改咗邊啲模型/價格/限制」

## 6) 轉化漏斗設計

### 入口層（TOFU）
- Welcome + AI Basics 強調「免費學到咩」
- 在高流量頁面加「1 個即用模板 preview」

### 考慮層（MOFU）
- 在 topic 尾部顯示「你而家差咩先去到實戰落地」
- 用 quiz 結果觸發「個人化升級建議」

### 轉化層（BOFU）
- Premium gate 顯示：
  - 實際可交付內容清單
  - 最近更新日期
  - 近 30 日新增內容

## 7) 續費/保留（如果將來轉月費）

### 續費前提
- 唔係靠舊內容，要靠「持續更新服務」
- 每月最少：
  - 1 次模型/價格更新
  - 1 個新案例
  - 1 個新模板包

### 保留機制
- Weekly learning streak
- 每週 challenge
- 每月 skill assessment（分數升級）

## 8) KPI 與目標值（建議）

- Free -> Standard 轉換率：>= 3%
- Standard -> Pro 升級率：>= 12%
- Premium 30 天留存：>= 55%
- 每課 Quiz 完成率：>= 45%
- 內容更新後 7 天回訪率：>= 30%

## 9) 90 日變現落地節奏

### Day 1-30（可信度修復）
- 先改高風險 AI + Deployment claim
- 每頁加 freshness/source 元件
- 補齊 10 個高流量課題 quiz

### Day 31-60（價值增強）
- 上線 3 個 bundle landing blocks
- 每個 premium topic 補齊 6 件套
- 引入學習完成證明（completion signal）

### Day 61-90（規模化）
- 啟用更新節奏（每月 changelog）
- 上線個人化升級 CTA
- 開始 A/B test pricing copy 與 bundle 順序

