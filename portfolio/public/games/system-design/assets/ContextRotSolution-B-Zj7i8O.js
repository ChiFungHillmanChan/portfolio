import{j as e,T as t,Q as s,R as n}from"./index-D4YSJ0iX.js";const i=[],l=[{slug:"skill-vs-agent",label:"Skill vs Agent"},{slug:"sdd-spec-driven-development",label:"SDD 規格驅動開發"},{slug:"ai-evaluation-loop",label:"AI 評估迴圈"},{slug:"prompt-engineering",label:"Prompt Engineering"}];function r(){return e.jsxs("div",{className:"card",children:[e.jsx("h2",{children:"Context Rot 係咩"}),e.jsx("div",{className:"subtitle",children:"長對話中 AI 輸出質素逐漸劣化嘅現象"}),e.jsxs("p",{children:["你有冇試過同 AI 傾咗好耐之後，佢開始「唔記得」你之前講嘅嘢？或者輸出質素越嚟越差，開始重複、矛盾、甚至忽略你早期嘅指示？呢個就係 ",e.jsx("strong",{style:{color:"#f87171"},children:"Context Rot"}),"——上下文腐爛。"]}),e.jsx("p",{children:"原因好簡單：AI 嘅 context window 有限（例如 128K token）。當對話越嚟越長，早期嘅內容會被「推出」attention 嘅焦點範圍。AI 唔係真係「忘記」，而係注意力被稀釋咗，早期指令嘅影響力大幅下降。"}),e.jsx("div",{className:"diagram-container",children:e.jsxs("svg",{viewBox:"0 0 700 320",xmlns:"http://www.w3.org/2000/svg",children:[e.jsxs("defs",{children:[e.jsx("filter",{id:"shadow",x:"-4%",y:"-4%",width:"108%",height:"108%",children:e.jsx("feDropShadow",{dx:"0",dy:"2",stdDeviation:"3",floodColor:"#000",floodOpacity:"0.3"})}),e.jsxs("linearGradient",{id:"gradWindow",x1:"0%",y1:"0%",x2:"100%",y2:"0%",children:[e.jsx("stop",{offset:"0%",stopColor:"#0f3d2e"}),e.jsx("stop",{offset:"50%",stopColor:"#3d2e0a"}),e.jsx("stop",{offset:"100%",stopColor:"#3d0f0f"})]}),e.jsxs("linearGradient",{id:"qualityGrad",x1:"0%",y1:"0%",x2:"100%",y2:"0%",children:[e.jsx("stop",{offset:"0%",stopColor:"#10B981"}),e.jsx("stop",{offset:"50%",stopColor:"#F59E0B"}),e.jsx("stop",{offset:"100%",stopColor:"#EF4444"})]})]}),e.jsx("text",{x:"350",y:"30",textAnchor:"middle",fill:"#9ca3af",fontSize:"12",fontWeight:"600",children:"Context Window 使用情況（隨時間推移）"}),e.jsx("rect",{x:"50",y:"50",width:"600",height:"80",rx:"12",fill:"url(#gradWindow)",stroke:"#2a2d3a",strokeWidth:"2",filter:"url(#shadow)"}),e.jsx("rect",{x:"55",y:"55",width:"80",height:"70",rx:"6",fill:"rgba(16,185,129,0.3)",stroke:"#10B981",strokeWidth:"1"}),e.jsx("text",{x:"95",y:"85",textAnchor:"middle",fill:"#10B981",fontSize:"9",fontWeight:"600",children:"System"}),e.jsx("text",{x:"95",y:"100",textAnchor:"middle",fill:"#10B981",fontSize:"9",children:"Prompt"}),e.jsx("rect",{x:"140",y:"55",width:"100",height:"70",rx:"6",fill:"rgba(16,185,129,0.2)",stroke:"#34d399",strokeWidth:"1"}),e.jsx("text",{x:"190",y:"85",textAnchor:"middle",fill:"#34d399",fontSize:"9",fontWeight:"600",children:"Early"}),e.jsx("text",{x:"190",y:"100",textAnchor:"middle",fill:"#34d399",fontSize:"9",children:"Instructions"}),e.jsx("rect",{x:"245",y:"55",width:"120",height:"70",rx:"6",fill:"rgba(245,158,11,0.2)",stroke:"#F59E0B",strokeWidth:"1"}),e.jsx("text",{x:"305",y:"85",textAnchor:"middle",fill:"#F59E0B",fontSize:"9",fontWeight:"600",children:"Mid Conv."}),e.jsx("text",{x:"305",y:"100",textAnchor:"middle",fill:"#F59E0B",fontSize:"9",children:"Context"}),e.jsx("rect",{x:"370",y:"55",width:"140",height:"70",rx:"6",fill:"rgba(239,68,68,0.2)",stroke:"#f87171",strokeWidth:"1"}),e.jsx("text",{x:"440",y:"85",textAnchor:"middle",fill:"#f87171",fontSize:"9",fontWeight:"600",children:"Recent Messages"}),e.jsx("text",{x:"440",y:"100",textAnchor:"middle",fill:"#f87171",fontSize:"9",children:"(佔據大量 token)"}),e.jsx("rect",{x:"515",y:"55",width:"130",height:"70",rx:"6",fill:"rgba(239,68,68,0.1)",stroke:"#f87171",strokeWidth:"1",strokeDasharray:"4,3"}),e.jsx("text",{x:"580",y:"85",textAnchor:"middle",fill:"#9ca3af",fontSize:"9",fontWeight:"600",children:"Token Limit"}),e.jsx("text",{x:"580",y:"100",textAnchor:"middle",fill:"#9ca3af",fontSize:"9",children:"即將溢出"}),e.jsx("text",{x:"50",y:"170",fill:"#9ca3af",fontSize:"11",fontWeight:"600",children:"Output Quality"}),e.jsx("path",{d:"M50,220 C150,220 200,225 300,240 C400,255 500,275 650,285",fill:"none",stroke:"url(#qualityGrad)",strokeWidth:"3"}),e.jsx("circle",{cx:"100",cy:"220",r:"4",fill:"#10B981"}),e.jsx("text",{x:"100",y:"210",textAnchor:"middle",fill:"#10B981",fontSize:"9",children:"高品質"}),e.jsx("circle",{cx:"350",cy:"245",r:"4",fill:"#F59E0B"}),e.jsx("text",{x:"350",y:"235",textAnchor:"middle",fill:"#F59E0B",fontSize:"9",children:"開始走樣"}),e.jsx("circle",{cx:"600",cy:"282",r:"4",fill:"#EF4444"}),e.jsx("text",{x:"600",y:"272",textAnchor:"middle",fill:"#EF4444",fontSize:"9",children:"嚴重劣化"}),e.jsx("line",{x1:"50",y1:"300",x2:"650",y2:"300",stroke:"#2a2d3a",strokeWidth:"1"}),e.jsx("text",{x:"350",y:"315",textAnchor:"middle",fill:"#9ca3af",fontSize:"10",children:"對話時間 →"})]})}),e.jsxs("ol",{className:"steps",children:[e.jsxs("li",{children:[e.jsx("span",{className:"step-num",children:"1"}),e.jsxs("span",{children:[e.jsx("strong",{children:"早期指令被稀釋"}),"：對話開頭嘅 system prompt 同指示，隨住新 message 加入，attention 權重會持續下降。"]})]}),e.jsxs("li",{children:[e.jsx("span",{className:"step-num",children:"2"}),e.jsxs("span",{children:[e.jsx("strong",{children:"Token 預算耗盡"}),"：Context window 有限，一旦填滿，最早嘅內容會被截斷或者壓縮，重要指令可能直接消失。"]})]}),e.jsxs("li",{children:[e.jsx("span",{className:"step-num",children:"3"}),e.jsxs("span",{children:[e.jsx("strong",{children:"輸出品質崩塌"}),"：當 AI 「睇唔到」你嘅原始需求，就會開始產生矛盾、重複、或者偏離方向嘅回應。"]})]})]})]})}function d(){return e.jsxs("div",{className:"card",children:[e.jsx("h2",{children:"三大解法"}),e.jsx("div",{className:"subtitle",children:"實用策略對抗 Context Rot"}),e.jsxs("div",{className:"key-points",children:[e.jsxs("div",{className:"key-point",children:[e.jsx("h4",{children:"解法一：Context Budget 預算管理"}),e.jsx("p",{children:"追蹤每次對話嘅 token 使用量。當用到 context window 嘅 60-70% 時，主動觸發清理。可以用 tiktoken 計算 token 數，設定硬性上限。關鍵係「預防勝於治療」——唔好等到爆先處理。"})]}),e.jsxs("div",{className:"key-point",children:[e.jsx("h4",{children:"解法二：Checkpoint Summary 檢查點總結"}),e.jsx("p",{children:"每隔一段時間（例如每 10 輪對話），叫 AI 總結目前為止嘅所有決定同進度。然後用呢個 summary 開一個新對話。效果等同「存檔再讀檔」，context 重新變得乾淨。"})]}),e.jsxs("div",{className:"key-point",children:[e.jsx("h4",{children:"解法三：State File 狀態檔案"}),e.jsx("p",{children:"將所有關鍵決策、架構選擇、命名規範寫入一個檔案（例如 DECISIONS.md）。每次新對話時將呢個檔案作為 context 載入。呢個係最持久嘅方法，因為資訊保存喺對話之外。"})]}),e.jsxs("div",{className:"key-point",children:[e.jsx("h4",{children:"組合使用效果最佳"}),e.jsx("p",{children:"三種方法唔係互斥嘅。最佳實踐係三招齊用：用 Budget 控制長度，用 Checkpoint 定期刷新，用 State File 持久保存。呢個 combo 可以將 Context Rot 嘅影響降到最低。"})]})]})]})}function o(){return e.jsxs("div",{className:"card",children:[e.jsx("h2",{children:"實戰流程：Step-by-Step 應用"}),e.jsx("div",{className:"subtitle",children:"喺真實 coding workflow 入面點樣對抗 Context Rot"}),e.jsxs("ol",{className:"steps",children:[e.jsxs("li",{children:[e.jsx("span",{className:"step-num",children:"1"}),e.jsxs("span",{children:[e.jsx("strong",{children:"開始前：建立 State File"}),"——喺 project 根目錄建 CONTEXT.md，記錄：項目目標、技術棧、架構決策、命名規範、已完成嘅功能。每次開新 AI 對話時，首先載入呢個檔案。"]})]}),e.jsxs("li",{children:[e.jsx("span",{className:"step-num",children:"2"}),e.jsxs("span",{children:[e.jsx("strong",{children:"設定 Token Budget"}),"——喺對話開頭就同 AI 講：「呢個對話嘅 token budget 係 50K。當你覺得接近限制時，主動提醒我做 checkpoint。」呢樣 AI 會幫你監控。"]})]}),e.jsxs("li",{children:[e.jsx("span",{className:"step-num",children:"3"}),e.jsxs("span",{children:[e.jsx("strong",{children:"每完成一個功能：做 Checkpoint"}),"——叫 AI 用 3-5 句總結剛剛做咗咩、有咩決策、下一步要做咩。將呢個 summary 加入 CONTEXT.md。"]})]}),e.jsxs("li",{children:[e.jsx("span",{className:"step-num",children:"4"}),e.jsxs("span",{children:[e.jsx("strong",{children:"感覺質素下降時：重開對話"}),"——唔好硬撐。一旦 AI 開始重複或者矛盾，立即做一個完整嘅 checkpoint summary，然後開新對話，載入 CONTEXT.md + summary。"]})]}),e.jsxs("li",{children:[e.jsx("span",{className:"step-num",children:"5"}),e.jsxs("span",{children:[e.jsx("strong",{children:"收工前：更新 State File"}),"——將今日所有嘅決策同進度整理返入 CONTEXT.md。第二日開工時，AI 可以無縫接上。"]})]})]}),e.jsxs("div",{className:"use-case",children:[e.jsx("h4",{children:"實際效果"}),e.jsx("p",{children:"用呢個 workflow 之後，長達幾日嘅開發項目都可以保持 AI 輸出質素一致。唔會再出現「AI 忘記咗架構決策」或者「推翻之前講好嘅命名規範」嘅情況。"})]})]})}function c(){return e.jsxs("div",{className:"card",children:[e.jsx("h2",{children:"AI Viber"}),e.jsx("div",{className:"subtitle",children:"複製 Prompt，貼去 AI 工具，管理好你嘅 Context"}),e.jsxs("div",{className:"prompt-card",children:[e.jsx("h4",{children:"Prompt 1 — Checkpoint Summary 生成器"}),e.jsx("div",{className:"prompt-text",children:`請幫我總結目前為止嘅對話內容，用以下格式：

## Checkpoint Summary

### 項目背景
（一句話描述項目）

### 已完成嘅決策
- 決策 1：...
- 決策 2：...

### 技術選擇
- 用咩技術棧 + 原因

### 已完成嘅功能
- 功能 1：（狀態：完成/進行中）
- 功能 2：...

### 未解決嘅問題
- 問題 1：...

### 下一步行動
- [ ] 下一步 1
- [ ] 下一步 2

注意：呢個 summary 會用喺新對話嘅 context 入面，所以要包含所有重要資訊，但盡量精簡，控制喺 500 字以內。`})]}),e.jsxs("div",{className:"prompt-card",children:[e.jsx("h4",{children:"Prompt 2 — State File 模板"}),e.jsx("div",{className:"prompt-text",children:`幫我建立一個 CONTEXT.md 檔案，用嚟保存項目嘅所有關鍵決策同上下文。

項目名稱：[項目名]
項目描述：[一兩句描述]
技術棧：[列出技術棧]

請用以下結構：

# Project Context — [項目名]

## 核心目標
（項目要達成咩）

## 架構決策記錄 (ADR)
| 編號 | 決策 | 原因 | 日期 |
|------|------|------|------|

## 命名規範
- 檔案命名：...
- 變數命名：...
- API endpoint：...

## 已知限制 / Tradeoffs
- ...

## 進度追蹤
- [x] 已完成項目
- [ ] 待做項目

每次 AI 對話開始時載入呢個檔案，每次結束時更新佢。`})]}),e.jsxs("div",{className:"prompt-card",children:[e.jsx("h4",{children:"Prompt 3 — Context Budget 監控指令"}),e.jsx("div",{className:"prompt-text",children:`喺呢個對話入面，請你幫我監控 context 使用情況：

1. 呢個對話嘅 token budget 係 [50K / 80K / 100K]
2. 當你估計用咗 60% budget 時，提醒我：「建議做 checkpoint」
3. 當你估計用咗 80% budget 時，自動生成 checkpoint summary
4. 每次回應嘅結尾加一行：[Context: ~XX% used]

如果我嘅 prompt 太長，建議我點樣精簡。如果之前嘅對話有重複嘅內容，幫我指出邊啲可以清理。`})]})]})}function a(){return e.jsxs(e.Fragment,{children:[e.jsx(t,{title:"Context Rot 解法",subtitle:"AI 對話越嚟越長，質素越嚟越差？呢度有三招解決",tabs:[{id:"overview",label:"① Context Rot 係咩",content:e.jsx(r,{})},{id:"solutions",label:"② 三大解法",content:e.jsx(d,{})},{id:"practice",label:"③ 實戰流程",premium:!0,content:e.jsx(o,{})},{id:"ai-viber",label:"④ AI Viber",premium:!0,content:e.jsx(c,{})}]}),e.jsxs("div",{className:"topic-container",children:[e.jsx(s,{data:i}),e.jsx(n,{topics:l})]})]})}export{a as default};
