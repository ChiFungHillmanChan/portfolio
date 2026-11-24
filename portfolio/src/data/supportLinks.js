// Where "support my work" payments go. Payment Link URLs are public, not secrets.
const supportLinks = {
  // Optional, one-off Stripe Payment Links on the Hong Kong account (HKD).
  // Each link redirects to https://hillmanchan.com/handbook/ai-engineer?thanks=1 after payment.
  currencySymbol: 'HK$',
  handbookTiers: [
    { amount: 10, url: 'https://buy.stripe.com/9B6bIVenu6LY0sXgyF3Nm0a' },
    { amount: 20, url: 'https://buy.stripe.com/7sY8wJfryb2e8Zt0zH3Nm0b' },
  ],
  // "Customise": Stripe does not allow customer-chosen prices on Hong Kong accounts, so this link
  // sells HK$1 units and the supporter sets the quantity on Stripe's page (35 units = HK$35).
  // `minimum` is the smallest quantity that link accepts.
  handbookCustom: { url: 'https://buy.stripe.com/5kQ7sFfry8U6grV0zH3Nm0d', minimum: 5 },
  // Shown instead when there is no way to pay.
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
