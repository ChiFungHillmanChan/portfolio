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
    book: aiEngineer,
  },
];

export const ACCESS_SECTIONS = [
  { access: 'free', heading: 'Free' },
  { access: 'paid', heading: 'Paid' },
];

export const releasedParts = (book) => book.parts.filter((part) => part.released);

export default handbooks;
