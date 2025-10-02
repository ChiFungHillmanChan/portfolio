import trainingDataJson from '../../data/training-data.json';
import loveThemeJson from '../../data/love-theme.json';
import gamingThemeJson from '../../data/gaming-theme.json';
import pokerThemeJson from '../../data/poker-theme.json';
import deepTalkThemeJson from '../../data/deep-talk-theme.json';
import secretThemeJson from '../../data/secret-theme.json';

const THEME_DATA_MAP = {
    'love-theme': loveThemeJson,
    'gaming-theme': gamingThemeJson,
    'poker-theme': pokerThemeJson,
    'deep-talk-theme': deepTalkThemeJson,
    'secret-theme': secretThemeJson
};

const clone = (data) => JSON.parse(JSON.stringify(data));

export const ApiClient = {
    async fetchTrainingData() {
        return clone(trainingDataJson);
    },

    async fetchThemeData(themeName) {
        const themeData = THEME_DATA_MAP[themeName];
        if (!themeData) {
            throw new Error(`Unknown theme: ${themeName}`);
        }
        return clone(themeData);
    },

    async fetchAllThemeData() {
        const result = {};
        for (const [themeName, themeData] of Object.entries(THEME_DATA_MAP)) {
            result[themeName] = clone(themeData);
        }
        return result;
    },

    async saveTrainingData() {
        console.warn('saveTrainingData is a no-op in the embedded portfolio version');
        return { success: true };
    },

    getThemeDataMap() {
        if (typeof structuredClone === 'function') {
            return structuredClone(THEME_DATA_MAP);
        }
        return clone(THEME_DATA_MAP);
    }
};

export default ApiClient;
