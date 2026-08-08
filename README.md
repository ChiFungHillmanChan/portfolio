# Hillman Chan's Portfolio Website

A modern, responsive portfolio website built with React.js, showcasing my projects, skills, and experience.

## Live Demo

Visit the live website: [Hillman Chan Portfolio](http://hillmanchan.com/)

## Built With

- [React.js](https://reactjs.org/) - Frontend framework
- [React Router](https://reactrouter.com/) - For routing and navigation
- [Tailwind CSS](https://tailwindcss.com/) - For styling
- [Framer Motion](https://www.framer.com/motion/) - For animations
- [EmailJS](https://www.emailjs.com/) - For contact form functionality
- [React Icons](https://react-icons.github.io/react-icons/) - For icons
- [Vercel Analytics](https://vercel.com/analytics) - For website analytics

## Features

- **Responsive Design** - Optimized for all device sizes
- **Dark Mode** - Toggle between light and dark themes
- **Animated UI** - Smooth transitions and animations using Framer Motion
- **Project Showcase** - Filterable projects with detailed descriptions
- **Contact Form** - Direct messaging through EmailJS integration
- **About Me** - Personal section that shares my background and interests
- **Interactive UI** - Dynamic and engaging user interface elements
- **SEO Friendly** - Optimized for search engines
- **Subdomain-routed games** - Ten playable apps served from one React build,
  each on its own subdomain (see below)

## Games and Interactive Demos

Ten standalone apps live in `portfolio/src/game/`. They share one React build:
`App.js` maps a hostname to a game component, so each is reachable both at
`<slug>.hillmanchan.com` and at `hillmanchan.com/<slug>` in development.

| Game | What it is | Subdomain |
|---|---|---|
| **Connect 4 — You vs Machine** | Unbeatable Connect 4. Bitboard negamax with α-β pruning, transposition tables, and an opening book derived from the solved-game literature | `connect4` |
| **Casino Edge Calculator** | Roulette, Blackjack and Baccarat expected-value tools with card counting and betting-strategy tracking | `casino-game` |
| **Prompt Hunter** | Multilingual AI game — players write creative prompts and use character abilities to defeat monsters | `prompt-hunter` |
| **System Design** | Interactive learning platform covering 28 topics, from load balancers and caches to payment systems and AI agent security, with inline SVG architecture diagrams | `system-design` |
| **Card Drawer** | Pass-and-play card dealer and poker scorepad for 2–10 players, hand-drawn SVG cards, optional jokers, automatic hand ranking | `card-drawer` |
| **打小人 Da Siu Yan** | Online 打小人 ritual — enter a name or upload a photo, then hit the paper effigy with a slipper while the incantation plays. Records the one-minute ritual as a 9:16 video to save or share | `da-siu-yan` |
| **小氣簿 Siu Hei Bou** | Cantonese grudge notebook rendered as a real book — log what friends did to annoy you, collect 嬲爆印, and once the card is full send them a public 找數卡 demanding dinner. Cloudflare Worker + D1 backend | `siu-hei-bou` |
| **Never Have I Ever** | Multilingual party card game with dynamic prompts, custom questions and language selection | `card-game` |
| **Math Memory** | Arithmetic memory game | `math-memory` |
| **Personal ChatBot** | Keyword-matching chatbot with mood-based response patterns | `chat-box` |

### Adding a game

1. Create `portfolio/src/game/<slug>/<Name>Game.js`
2. Register it in `GAME_SUBDOMAIN_COMPONENTS` and add a `<Route>` in `src/App.js`
3. Add the slug to `GAME_SUBDOMAIN_SLUGS` in `src/components/ProjectDetail.js`
4. Add the project entry to `src/projectData.json`
5. Point the subdomain at the same deployment

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or later)
- npm or yarn

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Future Improvements

- Blog section implementation
- More interactive project displays
- Enhanced animations and transitions
- Expanded project case studies
- Performance optimizations

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Hillman Chan - [hillmanchan709@gmail.com](mailto:hillmanchan709@gmail.com)

Project Link: [https://github.com/chifunghillmanchan/portfolio](https://github.com/chifunghillmanchan/portfolio)

---

Thank you for checking out my portfolio! Feel free to reach out if you have any questions or would like to collaborate on a project.
