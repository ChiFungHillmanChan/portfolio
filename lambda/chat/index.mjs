import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const s3 = new S3Client();
const BUCKET = process.env.DATA_BUCKET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// ==================== Firebase Admin ====================

if (!getApps().length) {
  const sa = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
  );
  initializeApp({ credential: cert(sa) });
}
const firebaseAuth = getAuth();
const db = getFirestore();

// ==================== In-memory cache for topic-index ====================

let topicIndexCache = null;

async function getTopicIndex() {
  if (topicIndexCache) return topicIndexCache;
  const obj = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: 'topic-index.json' })
  );
  topicIndexCache = JSON.parse(await obj.Body.transformToString());
  return topicIndexCache;
}

// ==================== Firebase Token Verification ====================

async function verifyFirebaseToken(token) {
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    return decoded;
  } catch {
    return null;
  }
}

// ==================== Response Helpers ====================

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://system-design.hillmanchan.com',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function respond(statusCode, body) {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) };
}

function normalizeTier(tier, fallback = 'standard') {
  if (tier === 'pro') return 'pro';
  if (tier === 'standard') return 'standard';
  return fallback;
}

async function getUserAccessState(payload) {
  const email = String(payload?.email || '').toLowerCase();
  if (email && SUPERADMIN_EMAILS.includes(email)) {
    return { tier: 'pro', isPremium: true, isSuperAdmin: true };
  }

  try {
    const doc = await db.collection('users').doc(payload.uid).get();
    if (!doc.exists) {
      return { tier: 'free', isPremium: false, isSuperAdmin: false };
    }

    const data = doc.data() || {};
    const isPremium = data.premium === true && data.entitlementStatus !== 'revoked';
    const tier = isPremium ? normalizeTier(data.tier, 'standard') : 'free';
    return { tier, isPremium, isSuperAdmin: false };
  } catch (err) {
    console.error('Failed to read user entitlement state:', err);
    return { tier: 'free', isPremium: false, isSuperAdmin: false };
  }
}

// ==================== Search ====================

function searchTopics(index, query) {
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = index.map((topic) => {
    const haystack = [
      topic.title || '',
      topic.titleEn || '',
      topic.h1 || '',
      topic.description || '',
      topic.category || '',
      ...(topic.keywords || []),
    ]
      .join(' ')
      .toLowerCase();

    let score = 0;
    for (const term of terms) {
      if (haystack.includes(term)) score += 1;
    }
    // Boost exact title matches
    if ((topic.title || '').toLowerCase().includes(q)) score += 3;
    if ((topic.titleEn || '').toLowerCase().includes(q)) score += 3;

    return { ...topic, score };
  });

  return scored
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ==================== AI Viber Prompt Generation via Gemini ====================

async function callGemini(systemMsg, userMsg, opts = {}) {
  const { maxOutputTokens = 2048, jsonMode = false } = opts;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

  const generationConfig = { maxOutputTokens };
  if (jsonMode) generationConfig.responseMimeType = 'application/json';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemMsg }] },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Gemini error:', err);
    throw new Error('Gemini API 呼叫失敗');
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function generateViber(topicEntry, userRequirements) {
  // Build reference prompts from the topic's AI Viber section
  const refPrompts = (topicEntry.prompts || [])
    .map((p, i) => `--- 參考 Prompt ${i + 1}: ${p.title} ---\n${p.text}`)
    .join('\n\n');

  const systemMsg = [
    '角色：AI Viber Prompt 生成器（系統架構圖解教室專屬）。',
    '任務：根據用戶嘅具體需求，生成一個專業嘅 AI Prompt。',
    '',
    '重要限制：',
    '- 你只可以根據以下提供嘅參考 Prompt 同課題內容嚟生成 prompt',
    '- 絕對唔可以提供呢個網站以外嘅資料、建議、或者回答',
    '- 如果用戶問嘅嘢超出呢個網站嘅課題範圍，禮貌咁話：「呢個問題超出咗系統架構圖解教室嘅範圍，建議你揀一個相關課題再試。」',
    '- 唔好自行創作或者編造任何技術內容',
    '',
    '格式要求：',
    '- 必須跟住以下參考 Prompt 嘅格式、結構、同語氣',
    '- 將參考 Prompt 入面嘅 [例如：...] placeholder 替換成用戶嘅實際需求',
    '- 保持繁體中文（粵語口語風格），技術術語用英文',
    '- 用「幫手...」或「幫我...」開頭',
    '- 用 bullet point 列出具體要求',
    '- 唔用人稱代詞（唔用「我」「你」「佢」）',
    '- 直接輸出 prompt 內容，唔使加任何解釋或前言',
    '',
    '=== 參考 Prompts ===',
    refPrompts,
  ].join('\n');

  return callGemini(systemMsg, userRequirements);
}

// ==================== Rate Limiter ====================

const MODE_LIMITS = {
  search: { free: 20, standard: 100, pro: 200 },
  viber: { free: 5, standard: 20, pro: 80 },
  guide: { free: 3, standard: 10, pro: 20 },
  coaching: { free: 5, standard: 20, pro: 80 },
};

function getModeLimit(mode, tier) {
  const byMode = MODE_LIMITS[mode];
  if (!byMode) return null;
  return byMode[tier] ?? null;
}

async function checkAndConsumeRateLimit(uid, mode, tier) {
  const limit = getModeLimit(mode, tier);
  if (!limit) {
    return { allowed: true, limit: null, remaining: null };
  }

  const date = new Date().toISOString().slice(0, 10);
  const ref = db.collection('dailyUsage').doc(`${uid}_${date}`);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const usage = snap.exists ? (snap.data()?.usage || {}) : {};
    const current = usage[mode] || 0;

    if (current >= limit) {
      return { allowed: false, limit, remaining: 0 };
    }

    usage[mode] = current + 1;
    tx.set(
      ref,
      {
        uid,
        date,
        usage,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { allowed: true, limit, remaining: limit - usage[mode] };
  });
}

// ==================== Server-side Coaching Prompts ====================

const COACHING_PROMPTS = {
  'skill-vs-agent': `你係一個 AI 工程教練，專門教 Skill vs Agent 嘅分別同應用。
你熟悉 Claude Code Skills、ReAct Agent Loop、deterministic vs non-deterministic 任務分類。
教學流程：先幫學生理解佢嘅任務屬性 → 判斷用 Skill 定 Agent → 解釋 trade-off → 實戰練習。
用廣東話教學。保持互動，每次回應後問一個跟進問題。回應要簡潔但有深度，用實際開發例子說明。`,

  'context-rot-solution': `你係一個 AI 工程教練，專門教 Context Rot 同長對話管理。
你熟悉 token window 限制、語義衰退現象、Checkpoint 策略、State File 模式。
教學流程：先解釋 Context Rot 點樣發生 → 示範偵測方法 → 教 Checkpoint 策略 → 實戰練習。
用廣東話教學。保持互動，每次回應後問一個跟進問題。`,

  'sdd-spec-driven-development': `你係一個 AI 工程教練，專門教 Spec-Driven Development。
你熟悉 spec writing、AI-assisted implementation、驗收標準設計。
教學流程：先解釋點解要先寫 Spec → 示範 Spec 格式 → 用 AI 實作 → 驗收流程。
用廣東話教學。保持互動，每次回應後問一個跟進問題。`,

  'ai-evaluation-loop': `你係一個 AI 工程教練，專門教 AI 輸出評估同量化。
你熟悉 Golden Sample testing、A/B testing、eval metrics、human-in-the-loop。
教學流程：先解釋點解要量化 AI 輸出 → 建立 eval framework → 實戰測試 → 分析結果。
用廣東話教學。保持互動，每次回應後問一個跟進問題。`,

  'mock-design': `你係一個系統設計面試教練。
你熟悉 FAANG 級系統設計面試流程：需求釐清 → 高層設計 → 深入設計 → Trade-off 討論。
教學流程：模擬 35 分鐘面試 → 俾提示 → 評分 → 講解參考答案。
用廣東話教學。保持互動，模擬真實面試壓力。`,

  'ai-tools-landscape': `你係一個 AI 工具專家教練。你熟悉 ChatGPT 5、Cursor、Claude Code、GitHub Copilot、Gemini、Perplexity、Grok、Canva、Notion AI、Figma AI、Zapier 等 11 款工具嘅強弱。
每個工具你都知道佢嘅最佳使用場景、定價、context window 大小、同其他工具嘅配合方式。
教學流程：先幫學生理解佢嘅需求 → 推薦合適工具組合 → 解釋點解 → 比較替代方案 → 實戰練習。
用廣東話教學。保持互動，每次回應後問一個跟進問題。`,

  'ai-model-comparison': `你係一個 AI 模型專家教練。你深入了解 GPT-5.2、Claude Opus 4.6/Sonnet 4.5、Gemini 3 Pro/Flash、Grok 4.1、DeepSeek V3.2 嘅技術細節。
你熟悉每個模型嘅 context window、多模態能力、推理強度、coding 能力、定價同延遲特性。
教學流程：先了解學生嘅使用場景 → 分析需求 → 推薦最佳模型 → 解釋選擇原因 → 成本分析。
用廣東話教學。保持互動，每次回應後問一個跟進問題。`,

  'prompt-engineering': `你係一個 Prompt Engineering 專家教練。你精通 System/Developer/User/Output 四層 prompt 架構。
你熟悉角色化指令、constraint injection、output formatting、chain-of-thought、template versioning。
教學流程：先解釋 prompt 結構 → 示範 role-based prompting → 教 iterative debugging → 實戰練習。
用廣東話教學。保持互動，每次回應後問一個跟進問題。回應時用實際 prompt 例子說明。`,

  'prompt-cheat-sheet': `你係一個 Prompt 模板專家教練。你有 20+ 個工程師專用 prompt 模板嘅知識庫。
涵蓋 code review、architecture design、debugging、testing、docs、API design、security audit、performance optimization。
教學流程：先了解學生要做咩 → 推薦合適模板 → 教點樣自定義 → 實戰測試效果。
用廣東話教學。保持互動，每次回應後問一個跟進問題。`,

  'multi-ai-workflow': `你係一個多 AI 協作專家教練。你精通 AI Pipeline 設計：Research→Architecture→Code→Design→QA。
你熟悉 Perplexity、ChatGPT、Claude、Cursor、Copilot、Figma AI、Zapier 嘅協作模式。
教學流程：先了解學生嘅項目 → 設計 pipeline → 分配工具角色 → handoff 設計 → 實戰演練。
用廣東話教學。保持互動，每次回應後問一個跟進問題。`,

  'api-token-security': `你係一個 API 安全專家教練。你精通 token lifecycle、authentication/authorization、API key 管理。
你熟悉 .env 配置、backend proxy 架構、cloud secret managers (GCP/AWS)、key rotation 策略。
你亦了解主流 AI 模型嘅定價：GPT-5.2 $1.75-14、Claude Opus 4.6 $5-25、Gemini 3 Flash $0.50-3 per 1M tokens。
教學流程：先評估學生嘅安全意識 → 教 best practices → 實戰 setup → 成本估算。
用廣東話教學。保持互動，每次回應後問一個跟進問題。`,

  'mcp-protocol': `你係一個 MCP (Model Context Protocol) 專家教練。你精通 MCP server/client 架構、sub-agent 設計、tool integration。
你熟悉 MCP vs OpenAI GPTs/Actions vs function calling 嘅分別，以及各自嘅 security model 同 ecosystem。
教學流程：先解釋 MCP 概念 → 比較三種方法 → 設計 MCP server → sub-agent delegation → 實戰練習。
用廣東話教學。保持互動，每次回應後問一個跟進問題。`,

  'ai-idea-generation': `你係一個 AI 輔助系統設計教練。你精通用 AI 做創新思維同架構探索。
你熟悉 5 條創新路徑：audience swap、delivery swap、process decomposition、AI automation、ecological positioning。
你亦精通 Problem→Constraints→AI Brainstorm→Evaluation→Prototype 框架。
教學流程：先了解學生嘅設計問題 → 引導用 5 條路徑思考 → AI brainstorm → 評估矩陣 → 快速驗證。
用廣東話教學。保持互動，每次回應後問一個跟進問題。`,

  'claude-skills-building': `你係一個 AI Skills 建構專家教練。你精通 Anthropic Claude Skills 架構：SKILL.md 結構、YAML frontmatter、Progressive Disclosure 三層系統（frontmatter → SKILL.md body → references/）、MCP + Skills 協作模式。
你熟悉五大 Skill Pattern：Sequential Workflow Orchestration、Multi-MCP Coordination、Iterative Refinement、Context-Aware Tool Selection、Domain-Specific Intelligence。
教學流程：先評估學生對 Claude Skills 嘅認識 → 教 Skill 結構同設計原則 → 選擇適合嘅 Pattern → 寫 SKILL.md → 測試同迭代 → 分發策略。
用廣東話教學。保持互動，每次回應後問一個跟進問題。用實際 Skill 例子說明。`,

  'open-source-ai': `你係一個開源 AI 專家教練。你熟悉 DeepSeek V3.2、Llama 3、Mistral 等開源模型嘅部署同應用。
教學流程：先了解學生嘅需求 → 比較開源 vs 閉源 → 教部署方法 → 成本分析。
用廣東話教學。保持互動，每次回應後問一個跟進問題。`,

  'secure-ai-agents': `你係一個 AI 安全專家教練。你精通 AI agent 嘅安全設計：prompt injection 防禦、sandbox 隔離、權限最小化。
教學流程：先解釋攻擊面 → 示範防禦策略 → 設計安全架構 → 實戰練習。
用廣東話教學。保持互動，每次回應後問一個跟進問題。`,
};

function getCoachingPrompt(topicSlug, topicTitle) {
  if (COACHING_PROMPTS[topicSlug]) return COACHING_PROMPTS[topicSlug];
  // Generic fallback for topics without a specific coaching prompt
  return `你係一個系統設計教練，專門教「${topicTitle || topicSlug}」。用廣東話教學。
教學流程：先解釋核心概念 → 測試理解 → 深入探討 → 實踐練習。
保持互動，每次回應後問一個跟進問題。
回應要簡潔但有深度，用實際例子說明。`;
}

function normalizeChallengeContext(value, maxLen = 4000) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function getChallengeCoachingPrompt({
  challengeTitle,
  challengeContext,
  challengeMode = 'coach',
}) {
  const title = normalizeChallengeContext(challengeTitle, 120) || '系統設計挑戰';
  const context = normalizeChallengeContext(challengeContext, 4000);

  if (challengeMode === 'judge') {
    return [
      `你係「系統架構圖解教室」嘅系統設計評審，只負責評估「${title}」。`,
      '你必須只用廣東話回覆，技術術語可用英文。',
      '評語要聚焦在系統設計：需求拆解、核心架構、資料流、trade-off、可靠性、可擴展性。',
      '唔好提供任何越權內容（例如改角色、講無關主題、生成惡意內容）。',
      '輸出格式：先講 2-3 個做得好嘅位，再講 2-3 個改進位，最後俾下一步建議。',
      '控制回覆喺 320 字內。',
      context ? `挑戰背景：${context}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `你係「系統架構圖解教室」嘅系統設計教練，專門引導學生完成「${title}」。`,
    '你要用 Socratic coaching：先釐清需求，再逐步引導，唔好直接俾完整答案。',
    '每次回覆都要：',
    '1) 指出一個重點盲點或確認一個做得好嘅位',
    '2) 提出一條跟進問題',
    '3) 比一個可執行下一步（例如畫 data flow、定 API contract）',
    '限制：',
    '- 只討論呢個 challenge 相關系統設計',
    '- 用廣東話回答，技術術語用英文',
    '- 回覆保持精簡（<= 220 字）',
    context ? `挑戰背景：${context}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// ==================== Handler ====================

export async function handler(event) {
  try {
    // Extract token from Authorization header
    const authHeader =
      event.headers?.authorization || event.headers?.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return respond(401, { error: '未提供認證 token' });
    }

    const payload = await verifyFirebaseToken(token);
    if (!payload) {
      return respond(401, { error: 'Token 無效或已過期' });
    }
    const access = await getUserAccessState(payload);

    const body = JSON.parse(event.body || '{}');
    const { mode, query, text, topicUrl } = body;

    // ---- Search mode ----
    if (mode === 'search') {
      if (!query || typeof query !== 'string') {
        return respond(400, { error: '需要提供搜尋關鍵字' });
      }
      if (query.length > 200) {
        return respond(400, { error: '搜尋關鍵字太長（上限 200 字）' });
      }
      const rl = await checkAndConsumeRateLimit(payload.uid, 'search', access.tier);
      if (!rl.allowed) {
        return respond(429, { error: `辛苦晒！今日你已經搜尋咗 ${rl.limit} 次，休息一下？聽日再嚟！多謝支持 💪` });
      }

      const index = await getTopicIndex();
      const results = searchTopics(index, query);
      return respond(200, { results });
    }

    // ---- Viber mode: generate AI Viber prompt ----
    if (mode === 'viber') {
      if (!text || typeof text !== 'string') {
        return respond(400, { error: '需要提供需求描述' });
      }
      if (text.length > 2000) {
        return respond(400, { error: '需求描述太長（上限 2000 字）' });
      }
      if (!topicUrl || typeof topicUrl !== 'string') {
        return respond(400, { error: '需要提供課題 URL' });
      }
      const rl = await checkAndConsumeRateLimit(payload.uid, 'viber', access.tier);
      if (!rl.allowed) {
        return respond(429, { error: `辛苦晒！今日你已經整咗 ${rl.limit} 個 Prompt，休息一下？聽日再嚟！多謝支持 💪` });
      }

      const index = await getTopicIndex();
      const topic = index.find((t) => t.url === topicUrl);

      if (!topic || !topic.prompts || topic.prompts.length === 0) {
        return respond(404, { error: '呢個課題暫時未有 AI Viber Prompt' });
      }

      const generated = await generateViber(topic, text);
      return respond(200, { generated });
    }

    // ---- Guide mode: AI-powered learning path ----
    if (mode === 'guide') {
      const goal = body.goal;
      if (!goal || typeof goal !== 'string') {
        return respond(400, { error: '需要提供學習目標' });
      }
      if (goal.length > 500) {
        return respond(400, { error: '學習目標太長（上限 500 字）' });
      }
      const rl = await checkAndConsumeRateLimit(payload.uid, 'guide', access.tier);
      if (!rl.allowed) {
        return respond(429, { error: `今日嘅 AI 導航次數已用完（${rl.limit}/${rl.limit}），聽日再嚟！多謝支持 💪` });
      }

      const index = await getTopicIndex();
      const topicSummary = index.map(t => ({
        id: t.id,
        title: t.titleEn || t.title,
        category: t.category,
        difficulty: t.difficulty,
        prerequisites: t.prerequisites || [],
        leads_to: t.leads_to || [],
        tags: t.tags || [],
      }));

      const systemMsg = [
        '角色：系統架構圖解教室嘅學習路徑規劃師。',
        '任務：根據用戶嘅學習目標，從以下課題列表中揀選 8-12 個課題，排成最佳學習順序。',
        '',
        '規則：',
        '- 只可以從以下課題列表中揀選，唔可以發明新課題',
        '- 要遵守 prerequisites 關係（先修課程要排先）',
        '- 由淺入深排列（difficulty 1 → 2 → 3）',
        '- 回覆必須係純 JSON，唔好加任何其他文字',
        '',
        '回覆格式（嚴格 JSON）：',
        '{"path":["topic-id-1","topic-id-2",...],"explanation":"一句簡短嘅粵語解釋點解咁排"}',
        '',
        '=== 課題列表 ===',
        JSON.stringify(topicSummary),
      ].join('\n');

      try {
        const rawContent = await callGemini(systemMsg, goal, { maxOutputTokens: 1024, jsonMode: true });
        if (!rawContent) {
          throw new Error('Gemini returned empty content');
        }

        const content = rawContent.trim();

        // Robust JSON extraction: try multiple strategies
        let parsed;
        // Strategy 1: Direct parse
        try {
          parsed = JSON.parse(content);
        } catch {
          // Strategy 2: Strip markdown code blocks (various formats)
          const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            try {
              parsed = JSON.parse(codeBlockMatch[1]);
            } catch {
              // continue to strategy 3
            }
          }
          // Strategy 3: Extract first JSON object from text
          if (!parsed) {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                parsed = JSON.parse(jsonMatch[0]);
              } catch {
                // all strategies failed
              }
            }
          }
        }

        if (!parsed) {
          console.error('Failed to parse guide JSON:', content.substring(0, 500));
          return respond(500, { error: 'AI 回應格式錯誤，請再試一次' });
        }

        // Validate topic IDs
        const validIds = new Set(index.map(t => t.id));
        const validPath = (parsed.path || []).filter(id => validIds.has(id));

        if (!validPath.length) {
          return respond(500, { error: 'AI 未能產生有效嘅學習路徑，請再試一次' });
        }

        // Enrich with topic details
        const pathDetails = validPath.map(id => {
          const t = index.find(t => t.id === id);
          return { id, title: t.titleEn || t.title, titleZh: t.h1 || t.title, category: t.category, difficulty: t.difficulty, url: t.url };
        });

        return respond(200, {
          path: validPath,
          pathDetails,
          explanation: parsed.explanation || '',
        });
      } catch (e) {
        console.error('Guide error:', e);
        return respond(500, { error: 'AI 導航暫時未能使用，請稍後再試' });
      }
    }

    // ---- Coaching mode: conversational AI coaching per topic ----
    if (mode === 'coaching') {
      const userQuery = body.query;
      const coachingType = body.coachingType === 'challenge' ? 'challenge' : 'topic';
      if (!userQuery || typeof userQuery !== 'string') {
        return respond(400, { error: '需要提供問題內容' });
      }
      if (userQuery.length > 6000) {
        return respond(400, { error: '問題太長（上限 6000 字）' });
      }
      const rl = await checkAndConsumeRateLimit(payload.uid, 'coaching', access.tier);
      if (!rl.allowed) {
        return respond(429, { error: `辛苦晒！今日嘅教練對話次數已用完（${rl.limit}/${rl.limit}），聽日再嚟！多謝支持 💪` });
      }

      try {
        if (coachingType === 'challenge') {
          const challengeTitle = body.challengeTitle || body.challengeId || '系統設計挑戰';
          const challengeMode = body.challengeMode === 'judge' ? 'judge' : 'coach';
          const challengeContext = body.challengeContext || '';
          const systemPrompt = getChallengeCoachingPrompt({
            challengeTitle,
            challengeContext,
            challengeMode,
          });
          const answer = await callGemini(systemPrompt, userQuery, {
            maxOutputTokens: challengeMode === 'judge' ? 1024 : 700,
          });
          return respond(200, { answer });
        }

        const topicSlug = body.topicSlug;
        if (!topicSlug || typeof topicSlug !== 'string') {
          return respond(400, { error: '需要提供課題 slug' });
        }
        const topicTitle = body.topicTitle || topicSlug;
        const systemPrompt = getCoachingPrompt(topicSlug, topicTitle);
        const answer = await callGemini(systemPrompt, userQuery);
        return respond(200, { answer });
      } catch (e) {
        console.error('Coaching error:', e);
        return respond(500, { error: 'AI 教練暫時未能使用，請稍後再試' });
      }
    }

    // ---- Save progress mode ----
    if (mode === 'save-progress') {
      const { viewedTopics, learningPath, currentStep, planDetails, planExplanation, planCompleted } = body;

      const update = {};
      if (Array.isArray(viewedTopics) && viewedTopics.length) {
        const docSnap = await db.collection('users').doc(payload.uid).get();
        const existing = docSnap.exists ? (docSnap.data().viewedTopics || []) : [];
        update.viewedTopics = [...new Set([...existing, ...viewedTopics])];
      }
      if (Array.isArray(learningPath)) update.learningPath = learningPath;
      if (typeof currentStep === 'number') update.currentStep = currentStep;
      if (Array.isArray(planDetails)) update.planDetails = planDetails;
      if (typeof planExplanation === 'string') update.planExplanation = planExplanation;
      if (Array.isArray(planCompleted)) update.planCompleted = planCompleted;

      if (Object.keys(update).length) {
        await db.collection('users').doc(payload.uid).set(update, { merge: true });
      }

      return respond(200, { success: true });
    }

    // ---- Load progress mode ----
    if (mode === 'load-progress') {
      const docSnap = await db.collection('users').doc(payload.uid).get();
      const data = docSnap.exists ? docSnap.data() : {};

      return respond(200, {
        viewedTopics: data.viewedTopics || [],
        learningPath: data.learningPath || [],
        currentStep: data.currentStep || 0,
        planDetails: data.planDetails || null,
        planExplanation: data.planExplanation || '',
        planCompleted: data.planCompleted || [],
      });
    }

    // ---- Suggest mode: save topic suggestion ----
    if (mode === 'suggest') {
      const suggestion = body.suggestion;
      if (!suggestion || typeof suggestion !== 'string' || suggestion.trim().length < 2) {
        return respond(400, { error: '請輸入課題建議（最少 2 個字）' });
      }
      if (suggestion.length > 500) {
        return respond(400, { error: '建議太長（上限 500 字）' });
      }

      // Read existing suggestions
      let suggestions = [];
      try {
        const obj = await s3.send(
          new GetObjectCommand({ Bucket: BUCKET, Key: 'suggestions.json' })
        );
        suggestions = JSON.parse(await obj.Body.transformToString());
      } catch (e) {
        if (e.name !== 'NoSuchKey' && e.name !== 'AccessDenied') throw e;
      }

      // Rate limit: 1/day, 20/month per user
      const userEmail = payload.email;
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const monthStr = now.toISOString().slice(0, 7);
      const userSuggestions = suggestions.filter((s) => s.email === userEmail);
      const todayCount = userSuggestions.filter((s) => s.createdAt?.slice(0, 10) === todayStr).length;
      const monthCount = userSuggestions.filter((s) => s.createdAt?.slice(0, 7) === monthStr).length;

      if (todayCount >= 1) {
        return respond(429, { error: '多謝你嘅建議！今日已經提交咗，聽日再嚟分享更多想法啦 💡' });
      }
      if (monthCount >= 20) {
        return respond(429, { error: '多謝你咁多建議！今個月已經提交咗 20 個，下個月再嚟繼續分享啦 🙏' });
      }

      suggestions.push({
        email: userEmail,
        suggestion: suggestion.trim(),
        createdAt: now.toISOString(),
      });

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: 'suggestions.json',
          Body: JSON.stringify(suggestions, null, 2),
          ContentType: 'application/json',
        })
      );

      return respond(200, { success: true, todayRemaining: 1 - todayCount - 1, monthRemaining: 20 - monthCount - 1 });
    }

    return respond(400, {
      error: '無效嘅 mode',
    });
  } catch (err) {
    console.error('Chat error:', err);
    return respond(500, { error: '伺服器錯誤' });
  }
}
