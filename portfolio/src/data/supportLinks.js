// Where "support my work" payments go. Payment Link URLs are public, not secrets.
const supportLinks = {
  // Optional, one-off Stripe Payment Links on the Hong Kong account (HKD). Stripe does not allow
  // customer-chosen amounts on Hong Kong accounts, so each tier is its own fixed-price link.
  // Each link redirects to https://hillmanchan.com/handbook?thanks=1 after payment.
  currencySymbol: 'HK$',
  handbookTiers: [
    { amount: 10, url: 'https://buy.stripe.com/9B6bIVenu6LY0sXgyF3Nm0a' },
    { amount: 20, url: 'https://buy.stripe.com/7sY8wJfryb2e8Zt0zH3Nm0b' },
    { amount: 50, url: 'https://buy.stripe.com/7sY00ddjq1rE0sXbel3Nm0c' },
  ],
  // Shown instead when there are no tiers.
  buyMeACoffee: 'https://buymeacoffee.com/hillmanchan709',
};

// Payments may only ever be sent to Stripe's hosted checkout over HTTPS.
export function isStripeCheckoutUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && hostname === 'buy.stripe.com';
  } catch {
    return false;
  }
}

export default supportLinks;
