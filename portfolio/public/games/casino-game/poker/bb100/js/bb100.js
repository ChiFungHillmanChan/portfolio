/* =====================================================
   POKER - bb/100 CALCULATOR
   ===================================================== */

(function () {
    'use strict';

    const els = {
        hands: document.getElementById('handsInput'),
        profit: document.getElementById('profitInput'),
        blinds: document.getElementById('blindsSelect'),
        calcBtn: document.getElementById('calcBtn'),
        resetBtn: document.getElementById('resetBtn'),
        rateRow: document.getElementById('rateRow'),
        rateValue: document.getElementById('rateValue'),
        totalBb: document.getElementById('totalBbValue'),
        perHand: document.getElementById('perHandValue'),
        perHandUnit: document.getElementById('perHandUnit'),
        stake: document.getElementById('stakeValue'),
        verdictBox: document.getElementById('verdictBox'),
        rateVerdict: document.getElementById('rateVerdict'),
        sampleVerdict: document.getElementById('sampleVerdict'),
        errorMsg: document.getElementById('errorMsg'),
    };

    const STORAGE_KEY = 'poker-bb100-state-v1';

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (_) {
            return null;
        }
    }

    function saveState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (_) {
            /* ignore quota */
        }
    }

    function clearState() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (_) {
            /* ignore */
        }
    }

    function getStakeLabel() {
        const opt = els.blinds.options[els.blinds.selectedIndex];
        return opt ? opt.dataset.label || opt.text : '';
    }

    function formatNumber(value, decimals) {
        if (!isFinite(value)) return '—';
        return value.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }

    function rateVerdict(rate) {
        if (rate < 0) {
            return 'Losing rate — review strategy, table selection, and tilt control.';
        }
        if (rate < 1) {
            return 'Basically breakeven. Variance will overwhelm this rate over any normal sample.';
        }
        if (rate < 3) {
            return 'Marginal winner. Beatable but still mostly noise vs. variance.';
        }
        if (rate < 7) {
            return 'Solid, sustainable win rate at most stakes.';
        }
        if (rate < 15) {
            return 'Strong win rate — typical of good micro-stakes regs.';
        }
        return 'Crushing rate. Usually indicates microstakes or a small sample.';
    }

    function sampleVerdict(hands) {
        if (hands < 1000) {
            return 'Tiny sample (<1k hands). Treat this as a session check, not a win rate.';
        }
        if (hands < 10000) {
            return 'Small sample (<10k hands). bb/100 here is mostly noise.';
        }
        if (hands < 50000) {
            return 'Growing sample (10k–50k). Direction is meaningful, magnitude is not.';
        }
        if (hands < 100000) {
            return 'Decent sample (50k–100k). Rate is becoming trustworthy.';
        }
        return 'Large sample (100k+). Rate is reasonably trustworthy.';
    }

    function showError(msg) {
        els.errorMsg.hidden = false;
        els.errorMsg.textContent = msg;
    }

    function clearError() {
        els.errorMsg.hidden = true;
        els.errorMsg.textContent = '';
    }

    function resetResults() {
        els.rateValue.textContent = '—';
        els.totalBb.textContent = '—';
        els.perHand.textContent = '—';
        els.rateRow.classList.remove('positive', 'negative');
        els.verdictBox.hidden = true;
        els.rateVerdict.textContent = '';
        els.sampleVerdict.textContent = '';
    }

    function updateStakeDisplay() {
        els.stake.textContent = getStakeLabel();
    }

    function calculate() {
        clearError();

        const handsRaw = els.hands.value.trim();
        const profitRaw = els.profit.value.trim();

        if (handsRaw === '' || profitRaw === '') {
            resetResults();
            showError('Enter total hands and profit/loss to calculate.');
            return;
        }

        const hands = Number(handsRaw);
        const profit = Number(profitRaw);
        const bb = Number(els.blinds.value);

        if (!isFinite(hands) || hands <= 0 || !Number.isInteger(hands)) {
            resetResults();
            showError('Total hands must be a positive whole number.');
            return;
        }

        if (!isFinite(profit)) {
            resetResults();
            showError('Profit/loss must be a number (negative is allowed).');
            return;
        }

        if (!isFinite(bb) || bb <= 0) {
            resetResults();
            showError('Select a valid blind level.');
            return;
        }

        const totalBb = profit / bb;
        const ratePer100 = (totalBb / hands) * 100;
        const perHand = profit / hands;

        els.rateValue.textContent = formatNumber(ratePer100, 2);
        els.totalBb.textContent = formatNumber(totalBb, 2);
        els.perHand.textContent = formatNumber(perHand, 4);

        els.rateRow.classList.remove('positive', 'negative');
        if (ratePer100 > 0.0005) {
            els.rateRow.classList.add('positive');
        } else if (ratePer100 < -0.0005) {
            els.rateRow.classList.add('negative');
        }

        updateStakeDisplay();

        els.rateVerdict.textContent = rateVerdict(ratePer100);
        els.sampleVerdict.textContent = sampleVerdict(hands);
        els.verdictBox.hidden = false;

        saveState({
            hands: handsRaw,
            profit: profitRaw,
            blinds: els.blinds.value,
        });
    }

    function resetAll() {
        els.hands.value = '';
        els.profit.value = '';
        // keep blinds where the user left them
        clearError();
        resetResults();
        updateStakeDisplay();
        clearState();
        els.hands.focus();
    }

    function restoreState() {
        const state = loadState();
        if (!state) return;
        if (state.hands != null) els.hands.value = state.hands;
        if (state.profit != null) els.profit.value = state.profit;
        if (state.blinds != null) {
            const optExists = Array.from(els.blinds.options).some(o => o.value === state.blinds);
            if (optExists) els.blinds.value = state.blinds;
        }
        updateStakeDisplay();
        if (els.hands.value !== '' && els.profit.value !== '') {
            calculate();
        }
    }

    function bindEvents() {
        els.calcBtn.addEventListener('click', calculate);
        els.resetBtn.addEventListener('click', resetAll);

        // Live update on edit + Enter to calculate
        [els.hands, els.profit].forEach(input => {
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    calculate();
                }
            });
            input.addEventListener('input', () => {
                clearError();
                if (els.hands.value !== '' && els.profit.value !== '') {
                    calculate();
                }
            });
        });

        els.blinds.addEventListener('change', () => {
            updateStakeDisplay();
            if (els.hands.value !== '' && els.profit.value !== '') {
                calculate();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateStakeDisplay();
        bindEvents();
        restoreState();
    });
})();
