export const CONFIG = {
    API: {
        TRAINING_DATA: '/api/training-data',
        THEME_ENDPOINTS: {
            'love-theme': '/api/love-theme',
            'gaming-theme': '/api/gaming-theme',
            'poker-theme': '/api/poker-theme',
            'deep-talk-theme': '/api/deep-talk-theme',
            'secret-theme': '/api/secret-theme'
        }
    },
    
    TIMING: {
        WELCOME_ANIMATION_CHAR_DELAY: 50,
        WELCOME_ANIMATION_END_DELAY: 800,
        TYPING_CHAR_DELAY: 10,
        TYPING_RESPONSE_MIN: 1000,
        TYPING_RESPONSE_MAX: 1500,
        THEME_TRANSITION_DELAY: 1200,
        MESSAGE_COMPLETION_DELAY: 1000
    },
    
    SECURITY: {
        MAX_FAILED_ATTEMPTS: 3,
        MAX_SECRET_ATTEMPTS: 3
    },
    
    SESSION: {
        FIRST_TRY_CHAT_MESSAGE: 'Seems like you want to try to find out secret chat... Type in some Key words to find out! Try to discover as much as you can XD~~~'
    },
    
    UI: {
        SIDEBAR_WIDTH: 300,
        SIDEBAR_WIDTH_MOBILE: 280,
        MOBILE_BREAKPOINT: 768,
        SMALL_MOBILE_BREAKPOINT: 430
    },
    
    TOPICS: {
        greetings: { label: '👋 Say Hi', category: 'greetings' },
        education: { label: '🎓 Education', category: 'education' },
        technologies: { label: '💻 Tech Skills', category: 'technologies' },
        projects: { label: '🚀 Projects', category: 'projects' },
        hobbies: { label: '🎮 Hobbies', category: 'hobbies' },
        career: { label: '💼 Career', category: 'career' },
        personality: { label: '🤔 About Me', category: 'personality' },
        contact: { label: '📧 Contact', category: 'contact' }
    },
    
    FOLLOW_UP_TOPICS: {
        greetings: [
            { label: '🎓 My Education', category: 'education' },
            { label: '💻 Tech Skills', category: 'technologies' },
            { label: '🎮 Fun Stuff', category: 'hobbies' }
        ],
        education: [
            { label: '💻 What I Code', category: 'technologies' },
            { label: '🚀 My Projects', category: 'projects' },
            { label: '💼 Career Goals', category: 'career' }
        ],
        technologies: [
            { label: '🚀 Cool Projects', category: 'projects' },
            { label: '🎓 Where I Learned', category: 'education' },
            { label: '💼 Career Path', category: 'career' }
        ],
        projects: [
            { label: '💻 Tech Stack', category: 'technologies' },
            { label: '📧 Get In Touch', category: 'contact' },
            { label: '🎮 Fun Side', category: 'hobbies' }
        ],
        hobbies: [
            { label: '🤔 My Personality', category: 'personality' },
            { label: '🚀 My Work', category: 'projects' },
            { label: '💻 Gaming Tech', category: 'technologies' }
        ],
        career: [
            { label: '💻 My Skills', category: 'technologies' },
            { label: '📧 Let\'s Connect', category: 'contact' },
            { label: '🤔 Who Am I', category: 'personality' }
        ],
        personality: [
            { label: '🎮 What I Enjoy', category: 'hobbies' },
            { label: '💼 Work Style', category: 'career' },
            { label: '🎓 Learning Journey', category: 'education' }
        ],
        contact: [
            { label: '🚀 See My Work', category: 'projects' },
            { label: '💻 Tech I Use', category: 'technologies' },
            { label: '🤔 About Me', category: 'personality' }
        ]
    }
};

export default CONFIG;
