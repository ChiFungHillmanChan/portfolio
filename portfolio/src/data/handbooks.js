import aiEngineer from './handbook';

// The handbook catalogue shown at /handbook. Each entry gets its own page at /handbook/<slug>.
// access: 'free' or 'paid' decides which section of the catalogue it appears in.
const handbooks = [
  {
    slug: 'ai-engineer',
    access: 'free',
    title: 'AI 軟件工程師完整學習手冊',
    titleLines: ['AI 軟件工程師', '完整學習手冊'],
    lang: 'zh-HK',
    summary:
      'The road to software engineer and AI engineer, from software fundamentals to interviewing. '
      + 'Written in Traditional Chinese, with technical terms kept in English.',
    // 目標: the cover line and the preface sentence of the handbook, quoted as written.
    goal: {
      label: '目標',
      lead: '成為 Software Engineer 或 AI Engineer 之路',
      text: '這本手冊整理了我認為在 AI 時代成為工程師需要掌握的知識：由 software 基本功、LLM 和 RAG、agent 與 orchestration，到 production 運作、評估、安全、ML 基礎、實作項目和面試。',
    },
    book: aiEngineer,
  },
];

export const ACCESS_SECTIONS = [
  { access: 'free', heading: 'Free' },
  { access: 'paid', heading: 'Paid' },
];

export const releasedParts = (book) => book.parts.filter((part) => part.released);

export default handbooks;
