export const SessionManager = {
    sessionData: {
        hasClickedTryChat: false,
        isFirstSession: true
    },

    init() {
        this.sessionData = {
            hasClickedTryChat: false,
            isFirstSession: true
        };
    },

    markTryChatClicked() {
        this.sessionData.hasClickedTryChat = true;
    },

    hasClickedTryChatBefore() {
        return this.sessionData.hasClickedTryChat;
    },

    shouldShowFirstTryChatMessage() {
        return !this.sessionData.hasClickedTryChat;
    },

    reset() {
        this.sessionData = {
            hasClickedTryChat: false,
            isFirstSession: true
        };
    },

    getSessionData() {
        return { ...this.sessionData };
    }
};

export default SessionManager;
