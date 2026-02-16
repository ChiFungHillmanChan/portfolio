import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const s3 = new S3Client();
const BUCKET = process.env.DATA_BUCKET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

// ==================== AI Viber Prompt Generation via OpenAI ====================

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

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      max_completion_tokens: 2048,
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: userRequirements },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('OpenAI error:', err);
    throw new Error('OpenAI API 呼叫失敗');
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ==================== Rate Limiter ====================

const RATE_LIMITS = { search: 100, viber: 20, guide: 10, coaching: 20 }; // per day

// In-memory rate tracking (resets on cold start, S3 for persistence not needed
// since Lambda warm instances handle most traffic and cold starts reset counts)
const rateCounts = {}; // { 'email:mode:YYYY-MM-DD': count }

function checkRateLimit(email, mode) {
  const limit = RATE_LIMITS[mode];
  if (!limit) return true;
  const key = `${email}:${mode}:${new Date().toISOString().slice(0, 10)}`;
  const count = rateCounts[key] || 0;
  if (count >= limit) return false;
  rateCounts[key] = count + 1;
  return true;
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

    const body = JSON.parse(event.body || '{}');
    const { mode, query, text, topicUrl } = body;

    // ---- Search mode ----
    if (mode === 'search') {
      if (!checkRateLimit(payload.email, 'search')) {
        return respond(429, { error: '辛苦晒！今日你已經搜尋咗 100 次，休息一下？聽日再嚟！多謝支持 💪' });
      }
      if (!query || typeof query !== 'string') {
        return respond(400, { error: '需要提供搜尋關鍵字' });
      }
      if (query.length > 200) {
        return respond(400, { error: '搜尋關鍵字太長（上限 200 字）' });
      }

      const index = await getTopicIndex();
      const results = searchTopics(index, query);
      return respond(200, { results });
    }

    // ---- Viber mode: generate AI Viber prompt ----
    if (mode === 'viber') {
      if (!checkRateLimit(payload.email, 'viber')) {
        return respond(429, { error: '辛苦晒！今日你已經整咗 20 個 Prompt，休息一下？聽日再嚟！多謝支持 💪' });
      }
      if (!text || typeof text !== 'string') {
        return respond(400, { error: '需要提供需求描述' });
      }
      if (text.length > 2000) {
        return respond(400, { error: '需求描述太長（上限 2000 字）' });
      }
      if (!topicUrl || typeof topicUrl !== 'string') {
        return respond(400, { error: '需要提供課題 URL' });
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
      if (!checkRateLimit(payload.email, 'guide')) {
        return respond(429, { error: '今日嘅 AI 導航次數已用完，聽日再嚟！多謝支持 💪' });
      }
      const goal = body.goal;
      if (!goal || typeof goal !== 'string') {
        return respond(400, { error: '需要提供學習目標' });
      }
      if (goal.length > 500) {
        return respond(400, { error: '學習目標太長（上限 500 字）' });
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
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            max_completion_tokens: 1024,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemMsg },
              { role: 'user', content: goal },
            ],
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          console.error('OpenAI guide error:', res.status, err.substring(0, 200));
          throw new Error('OpenAI API 呼叫失敗');
        }

        const aiData = await res.json();
        const rawContent = aiData.choices?.[0]?.message?.content;
        if (!rawContent) {
          throw new Error('OpenAI returned empty content');
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
      if (!checkRateLimit(payload.email, 'coaching')) {
        return respond(429, { error: '辛苦晒！今日嘅教練對話次數已用完，聽日再嚟！多謝支持 💪' });
      }
      const userQuery = body.query;
      const systemPrompt = body.systemPrompt;
      if (!userQuery || typeof userQuery !== 'string') {
        return respond(400, { error: '需要提供問題內容' });
      }
      if (userQuery.length > 2000) {
        return respond(400, { error: '問題太長（上限 2000 字）' });
      }
      if (!systemPrompt || typeof systemPrompt !== 'string') {
        return respond(400, { error: '需要提供教練系統 prompt' });
      }
      if (systemPrompt.length > 3000) {
        return respond(400, { error: '系統 prompt 太長（上限 3000 字）' });
      }

      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            max_completion_tokens: 2048,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userQuery },
            ],
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          console.error('OpenAI coaching error:', err);
          throw new Error('OpenAI API 呼叫失敗');
        }

        const aiData = await res.json();
        const answer = aiData.choices[0].message.content;
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
        if (e.name !== 'NoSuchKey') throw e;
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
