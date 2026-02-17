import { STRIPE_URL, STRIPE_PRO_URL } from '../config/constants';

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
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    icon: '⚡',
    listPrice: 899,
    salePrice: 399,
    savings: 500,
    billing: '一次性付款 · 永久存取',
    ctaText: '立即鎖定早鳥價',
    dailyAiLimit: 80,
    stripeUrl: STRIPE_PRO_URL,
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
