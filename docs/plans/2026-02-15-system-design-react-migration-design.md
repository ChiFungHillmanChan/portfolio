# System Design Platform — React Migration & New Features Design

**Date:** 2026-02-15
**Status:** Approved
**Target:** HK developers learning AI & system design (Cantonese)

## Goal

Migrate the existing vanilla HTML/JS system design platform to React (Component-Per-Topic approach), preserving all 59 topics and existing features. Then build 4 new roadmap.sh-style features on top: Visual Roadmap, AI Learning Plan, Coaching Mode, and Hands-on Projects.

## Constraints

- Zero backend changes — reuse existing `api.system-design.hillmanchan.com`
- Zero extra AWS costs — static files only
- All data in localStorage (progress, plans, coaching history)
- Cantonese only
- New code in `system-design-react/` folder — old code untouched
- All 59 existing topics preserved with identical UI/UX

## Architecture

### Project Structure

```
system-design-react/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx                    # HashRouter + layout
│   ├── index.jsx                  # Entry point
│   │
│   ├── components/                # Shared UI components
│   │   ├── Layout.jsx             # Sidebar + main content shell
│   │   ├── Sidebar.jsx            # Topic nav, search, filters, difficulty badges
│   │   ├── TopicTabs.jsx          # 4-tab system (free 1-2, premium 3-4)
│   │   ├── PremiumGate.jsx        # Lock overlay, upgrade CTA
│   │   ├── ChatWidget.jsx         # Floating chat (search/viber/suggest)
│   │   ├── QuizRenderer.jsx       # MCQ quiz from JSON
│   │   ├── PitfallStories.jsx     # 踩坑故事 renderer
│   │   ├── InterviewChecklist.jsx # Premium checklist
│   │   ├── RelatedTopics.jsx      # Related topics section
│   │   └── DiagramSVG.jsx         # Reusable SVG wrapper
│   │
│   ├── pages/                     # Route-level pages
│   │   ├── Welcome.jsx            # Landing page
│   │   ├── Premium.jsx            # Premium landing (HK$150)
│   │   ├── Roadmap.jsx            # Visual learning roadmap (NEW)
│   │   ├── AIPlanner.jsx          # AI learning plan generator (NEW)
│   │   ├── Coaching.jsx           # AI coaching sessions (NEW)
│   │   └── Projects.jsx           # Hands-on projects (NEW)
│   │
│   ├── topics/                    # 59 topic components (1:1 from HTML)
│   │   ├── LoadBalancer.jsx
│   │   ├── CDN.jsx
│   │   ├── Authentication.jsx
│   │   ├── ... (56 more)
│   │   └── index.js               # Export map { slug: Component }
│   │
│   ├── data/                      # Static content data
│   │   ├── topics.json            # Topic metadata (title, category, difficulty, slug)
│   │   ├── roadmap.json           # Roadmap nodes & connections (NEW)
│   │   └── projects.json          # Project listings (NEW)
│   │
│   ├── hooks/
│   │   ├── usePremium.js          # Premium status (localStorage)
│   │   ├── useProgress.js         # Topic view tracking (localStorage)
│   │   ├── useChat.js             # Chat API integration
│   │   └── useAuth.js             # JWT auth for chat
│   │
│   ├── context/
│   │   ├── PremiumContext.jsx
│   │   └── ProgressContext.jsx
│   │
│   └── styles/
│       └── index.css              # Tailwind + dark theme
│
├── package.json
├── tailwind.config.js
└── vite.config.js
```

### Routing (HashRouter)

```
/                    → Welcome page
/topic/:slug         → Topic viewer (59 topics)
/roadmap             → Visual learning roadmap (NEW)
/plan                → AI learning plan generator (NEW)
/coaching            → AI coaching sessions (NEW)
/coaching/:slug      → Topic-specific coaching (NEW)
/projects            → Hands-on projects (NEW)
/premium             → Premium landing page
```

## Migration: Existing Features → React

| Current (Vanilla HTML/JS) | React Equivalent |
|---|---|
| `index.html` sidebar | `Sidebar.jsx` with React state |
| iframe topic loading | React Router renders topic component |
| Tab switching via `data-tab` | `TopicTabs.jsx` with `useState` |
| `premium-gate.js` + localStorage | `PremiumContext` + `usePremium()` hook |
| Chat widget (800+ lines) | `ChatWidget.jsx` + `useChat()` hook |
| Quiz JSON in `<script>` tags | Imported JSON + `<QuizRenderer />` |
| Pitfall stories | `<PitfallStories />` component |
| Progress dots | `useProgress()` hook |
| Hash routing | `HashRouter` |
| Stripe checkout | Same `<a href>` link |

### Topic Component Pattern

```jsx
export default function LoadBalancer() {
  return (
    <>
      <TopicTabs
        title="Load Balancer 負載均衡器"
        subtitle="點樣將流量分配到多台服務器，保證高可用"
        tabs={[
          { id: 'overview', label: '① 整體架構', content: <OverviewTab /> },
          { id: 'algorithms', label: '② 分配演算法', content: <AlgorithmsTab /> },
          { id: 'practice', label: '③ L4 vs L7', premium: true, content: <PracticeTab /> },
          { id: 'ai-viber', label: '④ AI Viber', premium: true, content: <AIViberTab /> },
        ]}
      />
      <QuizRenderer data={quizData} />
      <PitfallStories topicSlug="load-balancer" />
    </>
  );
}
```

## New Features

### 1. Visual Roadmap (路線圖)

- Interactive SVG canvas showing all 59 topics as nodes
- Nodes colored by category, sized by difficulty
- Edges show dependencies (e.g., Database Basics → Distributed Cache → Redis)
- Completed topics show green checkmark (from `useProgress()`)
- Click node → navigate to `/topic/:slug`
- Zoom/pan via CSS transform
- Layout groups: 基礎概念 → 資料庫 → 快取 → 系統元件 → 進階設計 → 面試準備 → AI 專題
- Data stored in `roadmap.json`

### 2. AI Learning Plan (AI 學習計劃)

- 3-4 step questionnaire (goal, experience, hours/week, focus areas)
- Sends structured prompt to existing chat API
- AI returns week-by-week plan with specific topics
- Plan saved to localStorage, displayed as checklist dashboard
- User marks items complete
- No new backend endpoint — different prompt template to same API

### 3. Coaching Mode (AI 教練)

- Deep 1-on-1 AI sessions per topic
- Context-aware: AI receives full topic content as context
- Structured flow: explain → quiz → deepen → practice
- Per-topic coaching history in localStorage
- "開始教練模式" button on each topic page
- Uses existing chat API with coaching-specific system prompt

### 4. Projects (實戰項目)

- 8-12 guided projects (URL shortener, chat system, key-value store, etc.)
- `projects.json`: title, difficulty, estimated time, required topics, steps
- Steps reference existing topics ("先學 Load Balancer 再做呢步")
- Progress tracked per project in localStorage
- All static content — no backend

## What Is Preserved (No Changes)

- All 59 topic pages with 4-tab structure
- All SVG diagrams and visual content
- Free tabs 1-2, premium-gated tabs 3-4
- Quiz data, pitfall stories, interview checklists
- Sidebar with categories, search, difficulty badges
- Chat widget (search/viber/suggest modes)
- Premium gate + HK$150 Stripe checkout
- Progress tracking
- Dark theme (#0f1117)
- Mock design simulator
- Related topics sections
- Backend API at api.system-design.hillmanchan.com
- Firebase/Supabase auth
- localStorage for all client-side data

## Tech Stack

- React 18 (via Vite for fast dev)
- React Router v6 (HashRouter)
- Tailwind CSS
- No additional backend
- No additional AWS costs
