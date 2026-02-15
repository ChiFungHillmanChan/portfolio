import { useNavigate } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import topicData from '../data/topics.json';

export default function Welcome() {
  const navigate = useNavigate();
  const { total } = useProgress();
  const topicCount = topicData.topics.filter((t) => !t.disabled).length;

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-16 text-center">
      <div className="text-6xl mb-6">🏗</div>
      <h2 className="text-2xl font-bold text-text-primary mb-3">
        歡迎嚟到系統架構教室
      </h2>
      <p className="text-text-dim text-base leading-relaxed max-w-lg mb-8">
        呢度用廣東話，用最簡單、最直白嘅方式，理解各種系統設計嘅概念同架構圖。
      </p>

      <div className="flex items-center gap-2 text-text-dimmer text-sm mb-8">
        <span className="text-xl hidden lg:inline">👈</span>
        <span className="hidden lg:inline">喺左邊揀一個課題開始學習</span>
        <span className="text-xl lg:hidden">👆</span>
        <span className="lg:hidden">撳左上角 ☰ 揀一個課題開始學習</span>
      </div>

      {total > 0 && (
        <p className="text-accent-indigo-light text-sm">
          已閱讀 {total} / {topicCount} 課
        </p>
      )}

      {/* AI Basics Featured Section */}
      <button
        onClick={() => navigate('/topic/ai-basics-start-here')}
        className="w-full max-w-lg mt-8 mb-2 p-5 rounded-2xl text-left transition-all hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(135deg, rgba(167,139,250,0.1), rgba(99,102,241,0.08))',
          border: '1px solid rgba(167,139,250,0.3)',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🚀</span>
          <span className="text-lg font-bold text-text-primary">AI 基礎 — Start Here</span>
        </div>
        <p className="text-text-dim text-sm leading-relaxed mb-3">
          13 個 AI 核心主題、學習路徑、工具對比表——用工程師角度理解 AI。
        </p>
        <span className="text-sm font-medium" style={{ color: '#a78bfa' }}>
          開始探索 →
        </span>
      </button>

      {/* Quick links to new features */}
      <div className="flex flex-wrap gap-3 mt-8">
        <button
          onClick={() => navigate('/roadmap')}
          className="px-5 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-dim hover:text-text-primary hover:border-accent-indigo/50 transition-all text-sm"
        >
          🗺 學習路線圖
        </button>
        <button
          onClick={() => navigate('/plan')}
          className="px-5 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-dim hover:text-text-primary hover:border-accent-indigo/50 transition-all text-sm"
        >
          📋 AI 學習計劃
        </button>
        <button
          onClick={() => navigate('/coaching')}
          className="px-5 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-dim hover:text-text-primary hover:border-accent-indigo/50 transition-all text-sm"
        >
          🎓 AI 教練
        </button>
        <button
          onClick={() => navigate('/projects')}
          className="px-5 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-dim hover:text-text-primary hover:border-accent-indigo/50 transition-all text-sm"
        >
          🛠 實戰項目
        </button>
      </div>
    </div>
  );
}
