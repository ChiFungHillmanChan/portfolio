import { STRIPE_URL } from '../config/constants';

export const PREMIUM_PLANS = {
  standard: {
    tier: 'standard',
    name: 'Standard',
    icon: '🔓',
    listPrice: 350,
    salePrice: 150,
    savings: 200,
    billing: '一次性付款 · 永久存取',
    ctaText: '立即鎖定早鳥價',
    dailyAiLimit: 20,
    stripeUrl: STRIPE_URL,
    comingSoon: false,
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    icon: '⚡',
    listPrice: 899,
    salePrice: 399,
    savings: 500,
    billing: '一次性付款 · 永久存取',
    ctaText: 'Coming Soon',
    dailyAiLimit: 80,
    stripeUrl: null,
    comingSoon: true,
  },
};

export const PREMIUM_COPY = {
  urgencyTitle: '早鳥價 · 限時優惠',
  urgencyBody: '未來計劃轉為月費訂閱制。而家以一次性價格鎖定，即享永久存取權，唔受未來加價影響。',
  footerNote: '早鳥優惠隨時結束。一經購買即鎖定永久存取權，不受未來價格調整影響。',
};

export function formatHKD(amount) {
  return `HK$${Number(amount).toLocaleString('en-HK')}`;
}

export function tierDisplayName(tier) {
  if (tier === 'pro') return `Pro (${formatHKD(PREMIUM_PLANS.pro.salePrice)})`;
  if (tier === 'standard') return `Standard (${formatHKD(PREMIUM_PLANS.standard.salePrice)})`;
  return 'Free';
}

export const COMPETITOR_COMPARISON = [
  { name: 'ByteByteGo', price: 'US$79/年', hkd: '~HK$620', type: '影片 + 圖解', flag: '🇺🇸', highlight: false },
  { name: '九章算法', price: '¥3,999', hkd: '~HK$4,400', type: '錄播 + 作業', flag: '🇨🇳', highlight: false },
  { name: 'DesignGurus', price: 'US$79', hkd: '~HK$620', type: '文字 + Quiz', flag: '🇺🇸', highlight: false },
  { name: '本平台', price: 'HK$150', hkd: 'HK$150', type: 'AI 互動 + 廣東話', flag: '🇭🇰', highlight: true },
];

export const VALUE_STACK = [
  { item: '95+ 圖解課題', value: 2000, suffix: '' },
  { item: 'AI 教練 1 對 1', value: 1500, suffix: '' },
  { item: '8 個實戰項目 + AI 評估', value: 2000, suffix: '' },
  { item: 'AI 學習計劃生成器', value: 800, suffix: '' },
  { item: 'Prompt 模板庫', value: 500, suffix: '' },
  { item: '永久更新 + 新課題', value: 1000, suffix: '/年' },
];

export const DAILY_COST_REFRAME = 'HK$150 ÷ 365 = 每日 HK$0.41';
