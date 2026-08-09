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
| **小氣簿 Siu Hei Bou** | Cantonese grudge notebook rendered as a real book — log what friends did to annoy you, collect 嬲爆印, and once the card is full send them a public 找數卡 demanding dinner. Works fully offline: the book reads and writes with no signal, entries appear in pencil until they sync. Cloudflare Worker + D1 backend | `siu-hei-bou` |
| **Never Have I Ever** | Multilingual party card game with dynamic prompts, custom questions and language selection | `card-game` |
| **Math Memory** | Arithmetic memory game | `math-memory` |
| **Personal ChatBot** | Keyword-matching chatbot with mood-based response patterns | `chat-box` |

### Installable and offline

Several games are installable PWAs — open the subdomain on a phone and add it to
the home screen. Each has a manifest under `portfolio/public/pwa/`. Games that
ship as their own bundle under `portfolio/public/games/<slug>/` carry a service
worker there; the ones built into the shared React app (小氣簿 among them) are
covered by the root `portfolio/public/sw.js`, which keeps the shell — and the
Chinese handwriting font the book is set in — loadable without a network.

**小氣簿** goes further than caching the shell: the entire notebook is readable
and writable offline. It keeps a disposable local copy of the book plus an
ordered queue of unsent writes in IndexedDB, so entries written on the
Underground show up immediately — drawn in pencil rather than ink — and post
themselves once there is signal. Writes carry a client-generated id, which makes
retries idempotent: a request that succeeds but loses its reply on a flaky
connection cannot duplicate the entry. Two devices on the same account converge,
and the handful of writes that genuinely cannot be applied (an entry the other
phone already swept into a 找數卡) collect on a 未寄出 page rather than vanishing.

Editing any game requires bumping the `CACHE` version in that game's `sw.js`, or
returning players keep the old files. `node --test portfolio/public/games/pwa.test.mjs`
enforces manifest/precache integrity — it is **not** part of CI, so run it by hand.

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
