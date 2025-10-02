import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const presetOptions = [
  { label: '£3', value: 3 },
  { label: '£8', value: 8 },
  { label: '£18', value: 18 }
];

const BuyCoffeePage = () => {
  const [selectedPreset, setSelectedPreset] = useState(3);
  const [customAmount, setCustomAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const links = useMemo(() => ({
    three: process.env.REACT_APP_STRIPE_LINK_3 || '',
    eight: process.env.REACT_APP_STRIPE_LINK_8 || '',
    eighteen: process.env.REACT_APP_STRIPE_LINK_18 || '',
    custom: process.env.REACT_APP_STRIPE_LINK_CUSTOM || ''
  }), []);

  const amount = useMemo(() => {
    const parsed = parseFloat(customAmount);
    if (!isNaN(parsed) && parsed > 0) return Math.round(parsed * 100) / 100;
    return selectedPreset;
  }, [customAmount, selectedPreset]);

  const qualifies = amount >= 20;

  const getLinkForAmount = (gbpAmount) => {
    if (gbpAmount === 3 && links.three) return links.three;
    if (gbpAmount === 8 && links.eight) return links.eight;
    if (gbpAmount === 18 && links.eighteen) return links.eighteen;
    return links.custom;
  };

  const handleSupport = async () => {
    setIsSubmitting(true);
    try {
      const chosen = Number.isFinite(amount) ? amount : selectedPreset;
      let link = getLinkForAmount(chosen);

      if (!link) {
        alert('Stripe links are not configured yet. Please set REACT_APP_STRIPE_LINK_3/8/18 and REACT_APP_STRIPE_LINK_CUSTOM.');
        return;
      }

      // Prefill amount for custom Payment Link using minor units (pence)
      if (link === links.custom && chosen && chosen > 0) {
        const minorUnits = Math.round(chosen * 100);
        try {
          const url = new URL(link);
          url.searchParams.set('__prefilled_amount', String(minorUnits));
          link = url.toString();
        } catch (_) {
          const sep = link.includes('?') ? '&' : '?';
          link = `${link}${sep}__prefilled_amount=${minorUnits}`;
        }
      }

      window.location.href = link;
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, staggerChildren: 0.12 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div
      className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="mb-8">
        <Link 
          to="/my-offer"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Offerings
        </Link>
      </motion.div>

      <motion.div variants={itemVariants} className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 dark:text-white">Buy me a coffee ☕</h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300">
          If you've enjoyed my work or found it helpful, you can support me with a coffee. Thank you!
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white dark:bg-gray-700 rounded-2xl shadow-lg p-6 md:p-8">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Choose an amount</h2>

        <div className="mb-4">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200 text-sm">
            Donate £20 or more and I'll offer a 30-minute 1-on-1 session on AI coaching or any topic you choose as a thank you.
          </div>
          {qualifies && (
            <div className="mt-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm">
              Your current selection qualifies for a 30-minute 1-on-1 session.
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {presetOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSelectedPreset(opt.value); setCustomAmount(''); }}
              className={`px-4 py-2 rounded-full border transition-colors duration-200 ${
                selectedPreset === opt.value
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Or enter a custom amount (GBP)
          </label>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="0.5"
                placeholder={String(selectedPreset)}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            {customAmount && (
              <button
                type="button"
                onClick={() => setCustomAmount('')}
                className="text-sm text-gray-600 dark:text-gray-300 underline"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Custom amounts are prefilled on Stripe. You can still adjust it before paying.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-gray-700 dark:text-gray-200">
            Selected: <span className="font-semibold">£{amount.toFixed(2)}</span>
          </div>
          <button
            onClick={handleSupport}
            disabled={isSubmitting}
            className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors duration-300 disabled:opacity-70"
          >
            {isSubmitting ? 'Redirecting…' : 'Support with Stripe'}
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          Payments are processed securely by Stripe. No card details are handled on this site.
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BuyCoffeePage;




