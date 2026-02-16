import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'portfolio/src/game/system-design/src');
const outputDir = path.join(repoRoot, 'docs/system-design-audit/2026-02-16');

const TOPICS_JSON = path.join(srcRoot, 'data/topics.json');
const TOPICS_INDEX = path.join(srcRoot, 'topics/index.js');

const FILE_EXTS = new Set(['.jsx', '.js', '.json']);

const CLAIM_LINE_PATTERNS = [
  /\bGPT[-\s]?\d+(?:\.\d+)?\b/ig,
  /\bClaude(?:\s+[A-Za-z]+)?\s*\d*(?:\.\d+)?\b/ig,
  /\bGemini\s*\d*(?:\.\d+)?\b/ig,
  /\bDeepSeek(?:\s*[A-Za-z0-9.-]+)?\b/ig,
  /\bLlama\s*\d*(?:\.\d+)?\b/ig,
  /\bOpenAI\b/ig,
  /\bAnthropic\b/ig,
  /\bMCP\b/ig,
  /\bModel\s*Context\s*Protocol\b/ig,
  /\bcontext\s*window\b/ig,
  /\b\d+(?:K|M|k|m)\s*token(?:s)?\b/g,
  /\$\s?\d+(?:\.\d+)?(?:\s*[-~]\s*\$?\d+(?:\.\d+)?)?/g,
  /\bpricing\b|\bprice\b|定價|價格/ig,
  /Vercel|Railway|Supabase|Render|Firebase|Cloudflare Tunnel|ngrok/ig,
];

const CLAIM_TYPE_PATTERNS = {
  numeric: [/\$/, /\b\d+(?:\.\d+)?\b/, /token/i, /context\s*window/i, /month|每月|月費/i],
  capability: [/support|支援|ability|feature|function calling|tool calling|plugin|multimodal|agent/i],
  strategy: [/建議|策略|workflow|pipeline|best practice|SLA|guardrail|eval/i],
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function listFilesRecursive(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (entry.isFile()) {
        out.push(abs);
      }
    }
  }
  return out;
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function lineCount(text) {
  return text.length === 0 ? 0 : text.split(/\r?\n/).length;
}

function countMatches(text, regex) {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const clone = new RegExp(regex.source, flags);
  const matches = text.match(clone);
  return matches ? matches.length : 0;
}

function parseTopicIndex() {
  const text = readText(TOPICS_INDEX);
  const importMap = new Map();
  const importRegex = /^import\s+([A-Za-z0-9_]+)\s+from\s+'\.\/([^']+)';$/gm;
  let m;
  while ((m = importRegex.exec(text)) !== null) {
    importMap.set(m[1], `${m[2]}.jsx`);
  }

  const lazyRegex = /^const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\(\)\s*=>\s*import\('\.\/([^']+)'\)\);$/gm;
  while ((m = lazyRegex.exec(text)) !== null) {
    importMap.set(m[1], `${m[2]}.jsx`);
  }

  const slugMap = new Map();
  const objectRegex = /'([^']+)'\s*:\s*([A-Za-z0-9_]+)/g;
  while ((m = objectRegex.exec(text)) !== null) {
    const slug = m[1];
    const symbol = m[2];
    const fileName = importMap.get(symbol);
    if (fileName) slugMap.set(slug, fileName);
  }
  return slugMap;
}

function detectClaimHitsByLine(filePath) {
  const text = readText(filePath);
  const lines = text.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().length < 6) continue;
    let hit = false;
    for (const p of CLAIM_LINE_PATTERNS) {
      const flags = p.flags.includes('g') ? p.flags : `${p.flags}g`;
      const clone = new RegExp(p.source, flags);
      if (clone.test(line)) {
        hit = true;
        break;
      }
    }
    if (hit) {
      rows.push({
        file: rel(filePath),
        line: i + 1,
        text: line.trim(),
      });
    }
  }
  return rows;
}

function classifyClaim(text) {
  let claimType = 'strategy';
  if (CLAIM_TYPE_PATTERNS.numeric.some((p) => p.test(text))) claimType = 'numeric';
  else if (CLAIM_TYPE_PATTERNS.capability.some((p) => p.test(text))) claimType = 'capability';
  else if (CLAIM_TYPE_PATTERNS.strategy.some((p) => p.test(text))) claimType = 'strategy';

  const severity =
    claimType === 'numeric'
      ? 'high'
      : /GPT|Claude|Gemini|DeepSeek|OpenAI|Anthropic|MCP|pricing|price|定價|價格/i.test(text)
        ? 'medium'
        : 'low';

  return { claimType, severity };
}

function extractTopicQuizStats(topicText) {
  const hasQuizRenderer = /<QuizRenderer/.test(topicText);
  const usesDataProp = /<QuizRenderer[^>]*\bdata=/.test(topicText);
  const usesQuizDataProp = /<QuizRenderer[^>]*\bquizData=/.test(topicText);

  let quizDataDefined = false;
  let quizQuestionCount = 0;
  const quizBlockMatch = topicText.match(/const\s+quizData\s*=\s*\[(.|\r|\n)*?\n\];/m);
  if (quizBlockMatch) {
    quizDataDefined = true;
    const block = quizBlockMatch[0];
    quizQuestionCount = (block.match(/\b(question|q)\s*:/g) || []).length;
  }

  return {
    hasQuizRenderer,
    usesDataProp,
    usesQuizDataProp,
    quizDataDefined,
    quizQuestionCount,
  };
}

function computeTeachingSignals(topicText) {
  const checks = {
    learningOutcome: /(你會學到|學習目標|學習重點|learning\s+outcome|what\s+you\s+will\s+learn)/i.test(topicText),
    workflow: /(流程|步驟|workflow|pipeline|step\s*[1-9]|①|②|③|④)/i.test(topicText),
    pitfalls: /(常見錯誤|pitfall|陷阱|踩坑|anti-pattern|注意事項)/i.test(topicText),
    nextSteps: /(下一步|延伸|next\s*step|下一個)/i.test(topicText),
  };

  const score = Object.values(checks).filter(Boolean).length;
  return { ...checks, score, maxScore: 4 };
}

function computeTimeSensitiveHits(topicText) {
  let hits = 0;
  for (const p of CLAIM_LINE_PATTERNS) {
    hits += countMatches(topicText, p);
  }
  return hits;
}

function riskLevelByHits(hits) {
  if (hits >= 30) return 'high';
  if (hits >= 8) return 'medium';
  return 'low';
}

function buildTopicMatrix() {
  const topicData = JSON.parse(readText(TOPICS_JSON));
  const slugToFile = parseTopicIndex();
  const rows = [];

  for (const topic of topicData.topics) {
    const fileName = slugToFile.get(topic.slug) || null;
    const topicPath = fileName ? path.join(srcRoot, 'topics', fileName) : null;
    const exists = topicPath ? fs.existsSync(topicPath) : false;

    let metrics = {
      lineCount: 0,
      timeSensitiveHits: 0,
      riskLevel: 'unknown',
      quiz: {
        hasQuizRenderer: false,
        usesDataProp: false,
        usesQuizDataProp: false,
        quizDataDefined: false,
        quizQuestionCount: 0,
      },
      teaching: {
        learningOutcome: false,
        workflow: false,
        pitfalls: false,
        nextSteps: false,
        score: 0,
        maxScore: 4,
      },
    };

    if (exists && topicPath) {
      const text = readText(topicPath);
      const quiz = extractTopicQuizStats(text);
      const teaching = computeTeachingSignals(text);
      const hits = computeTimeSensitiveHits(text);

      metrics = {
        lineCount: lineCount(text),
        timeSensitiveHits: hits,
        riskLevel: riskLevelByHits(hits),
        quiz,
        teaching,
      };
    }

    rows.push({
      slug: topic.slug,
      title: topic.title,
      category: topic.category,
      premium: Boolean(topic.premium),
      difficulty: topic.difficulty || null,
      file: fileName ? `portfolio/src/game/system-design/src/topics/${fileName}` : null,
      exists,
      ...metrics,
    });
  }

  return rows;
}

function buildPageMatrix() {
  const pagesDir = path.join(srcRoot, 'pages');
  const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith('.jsx'));
  return files.map((fileName) => {
    const abs = path.join(pagesDir, fileName);
    const text = readText(abs);
    const hits = computeTimeSensitiveHits(text);
    return {
      file: rel(abs),
      lineCount: lineCount(text),
      timeSensitiveHits: hits,
      riskLevel: riskLevelByHits(hits),
    };
  });
}

function buildComponentMatrix() {
  const dir = path.join(srcRoot, 'components');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsx'));
  return files.map((fileName) => {
    const abs = path.join(dir, fileName);
    const text = readText(abs);
    return {
      file: rel(abs),
      lineCount: lineCount(text),
      hasPremiumLogic: /premium|Premium|isPremium/.test(text),
      hasQuizLogic: /QuizRenderer|quiz/i.test(text),
      hasAuthLogic: /auth|Auth|token|user/.test(text),
    };
  });
}

function buildDataMatrix() {
  const dataDir = path.join(srcRoot, 'data');
  const files = listFilesRecursive(dataDir)
    .filter((f) => FILE_EXTS.has(path.extname(f)))
    .sort((a, b) => a.localeCompare(b));

  return files.map((abs) => {
    const text = readText(abs);
    const hits = computeTimeSensitiveHits(text);
    return {
      file: rel(abs),
      lineCount: lineCount(text),
      timeSensitiveHits: hits,
      riskLevel: riskLevelByHits(hits),
    };
  });
}

function buildClaimExtract() {
  const roots = [
    path.join(srcRoot, 'topics'),
    path.join(srcRoot, 'pages'),
    path.join(srcRoot, 'data'),
    path.join(srcRoot, 'components'),
  ];

  const files = roots
    .flatMap((root) => listFilesRecursive(root))
    .filter((abs) => FILE_EXTS.has(path.extname(abs)))
    .sort((a, b) => a.localeCompare(b));

  const claims = [];
  for (const abs of files) {
    const hits = detectClaimHitsByLine(abs);
    for (const hit of hits) {
      const { claimType, severity } = classifyClaim(hit.text);
      claims.push({
        id: `claim-${String(claims.length + 1).padStart(4, '0')}`,
        ...hit,
        claimType,
        severity,
        status: 'Needs Review',
        asOfDate: '2026-02-16',
        sourceUrls: [],
        confidence: 'low',
      });
    }
  }

  return claims;
}

function buildSummary(topicMatrix, pageMatrix, componentMatrix, dataMatrix, claims) {
  const topicCount = topicMatrix.length;
  const missingTopicFiles = topicMatrix.filter((t) => !t.exists).length;
  const premiumTopics = topicMatrix.filter((t) => t.premium).length;

  const quizStats = {
    hasQuizRenderer: topicMatrix.filter((t) => t.quiz.hasQuizRenderer).length,
    withQuizData: topicMatrix.filter((t) => t.quiz.quizDataDefined).length,
    withQuizQuestions: topicMatrix.filter((t) => t.quiz.quizQuestionCount > 0).length,
    emptyQuizData: topicMatrix.filter((t) => t.quiz.quizDataDefined && t.quiz.quizQuestionCount === 0).length,
    propMismatch: topicMatrix.filter((t) => t.quiz.usesQuizDataProp && !t.quiz.usesDataProp).map((t) => t.slug),
  };

  const timeSensitive = {
    highRiskTopics: topicMatrix.filter((t) => t.riskLevel === 'high').length,
    mediumRiskTopics: topicMatrix.filter((t) => t.riskLevel === 'medium').length,
    lowRiskTopics: topicMatrix.filter((t) => t.riskLevel === 'low').length,
    totalClaimLines: claims.length,
    highSeverityClaims: claims.filter((c) => c.severity === 'high').length,
    mediumSeverityClaims: claims.filter((c) => c.severity === 'medium').length,
  };

  const teachingQuality = {
    avgScore: Number(
      (
        topicMatrix.reduce((acc, topic) => acc + topic.teaching.score, 0) /
        Math.max(topicMatrix.length, 1)
      ).toFixed(2)
    ),
    scoreDistribution: {
      score0: topicMatrix.filter((t) => t.teaching.score === 0).length,
      score1: topicMatrix.filter((t) => t.teaching.score === 1).length,
      score2: topicMatrix.filter((t) => t.teaching.score === 2).length,
      score3: topicMatrix.filter((t) => t.teaching.score === 3).length,
      score4: topicMatrix.filter((t) => t.teaching.score === 4).length,
    },
  };

  return {
    generatedAt: new Date().toISOString(),
    asOfDate: '2026-02-16',
    scope: 'portfolio/src/game/system-design/src',
    totals: {
      topics: topicCount,
      pages: pageMatrix.length,
      components: componentMatrix.length,
      dataFiles: dataMatrix.length,
      missingTopicFiles,
      premiumTopics,
    },
    quizStats,
    timeSensitive,
    teachingQuality,
  };
}

function main() {
  ensureDir(outputDir);

  const topicMatrix = buildTopicMatrix();
  const pageMatrix = buildPageMatrix();
  const componentMatrix = buildComponentMatrix();
  const dataMatrix = buildDataMatrix();
  const claims = buildClaimExtract();
  const summary = buildSummary(topicMatrix, pageMatrix, componentMatrix, dataMatrix, claims);

  const payload = {
    summary,
    topicMatrix,
    pageMatrix,
    componentMatrix,
    dataMatrix,
  };

  const quizAudit = {
    generatedAt: summary.generatedAt,
    asOfDate: summary.asOfDate,
    stats: summary.quizStats,
    topics: topicMatrix.map((topic) => ({
      slug: topic.slug,
      title: topic.title,
      category: topic.category,
      premium: topic.premium,
      file: topic.file,
      hasQuizRenderer: topic.quiz.hasQuizRenderer,
      usesDataProp: topic.quiz.usesDataProp,
      usesQuizDataProp: topic.quiz.usesQuizDataProp,
      quizDataDefined: topic.quiz.quizDataDefined,
      quizQuestionCount: topic.quiz.quizQuestionCount,
      status:
        topic.quiz.hasQuizRenderer && topic.quiz.quizQuestionCount > 0
          ? 'ready'
          : topic.quiz.hasQuizRenderer && topic.quiz.quizDataDefined && topic.quiz.quizQuestionCount === 0
            ? 'empty-quiz'
            : topic.quiz.hasQuizRenderer
              ? 'no-quizdata'
              : 'no-quizrenderer',
    })),
  };

  fs.writeFileSync(path.join(outputDir, 'content-matrix.json'), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'quiz-audit.json'), `${JSON.stringify(quizAudit, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'claims-raw-extract.json'), `${JSON.stringify(claims, null, 2)}\n`);

  console.log(`Generated:\n- ${rel(path.join(outputDir, 'content-matrix.json'))}\n- ${rel(path.join(outputDir, 'quiz-audit.json'))}\n- ${rel(path.join(outputDir, 'claims-raw-extract.json'))}`);
  console.log(`Topics: ${summary.totals.topics}, Claims: ${claims.length}, Quiz ready: ${summary.quizStats.withQuizQuestions}`);
}

main();
