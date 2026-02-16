import { useState } from 'react';

export default function QuizRenderer({ data, quizData }) {
  const [answers, setAnswers] = useState({});
  const [showScore, setShowScore] = useState(false);

  // Backward-compatible input: new prop is `data`, legacy prop is `quizData`.
  const quizItems = data ?? quizData ?? [];
  if (quizItems.length === 0) return null;

  const handleAnswer = (qIndex, optIndex, correct) => {
    if (answers[qIndex] !== undefined) return;
    const next = { ...answers, [qIndex]: { optIndex, correct } };
    setAnswers(next);
    if (Object.keys(next).length === quizItems.length) {
      setShowScore(true);
    }
  };

  const score = Object.values(answers).filter((a) => a.correct).length;

  return (
    <div className="card mt-6">
      <h2 className="text-lg font-bold text-text-primary mb-4">📝 小測驗</h2>

      {quizItems.map((q, qi) => (
        <div key={qi} className="mb-6 last:mb-0">
          <p className="text-text-secondary text-[0.95rem] mb-3 font-medium">
            {qi + 1}. {q.question}
          </p>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, oi) => {
              const answered = answers[qi] !== undefined;
              const selected = answers[qi]?.optIndex === oi;
              let borderColor = '#2a2d3a';
              let bgColor = 'transparent';

              if (answered) {
                if (opt.correct) {
                  borderColor = '#10B981';
                  bgColor = 'rgba(16,185,129,0.08)';
                } else if (selected && !opt.correct) {
                  borderColor = '#f87171';
                  bgColor = 'rgba(248,113,113,0.08)';
                }
              }

              return (
                <button
                  key={oi}
                  className="text-left px-4 py-3 rounded-lg border text-[0.9rem] text-text-muted transition-all"
                  style={{ borderColor, background: bgColor }}
                  onClick={() => handleAnswer(qi, oi, opt.correct)}
                  disabled={answered}
                >
                  {opt.text}
                  {answered && selected && (
                    <div className="mt-2 text-[0.8rem] text-text-dim leading-relaxed">
                      {opt.explanation}
                    </div>
                  )}
                  {answered && opt.correct && !selected && (
                    <div className="mt-2 text-[0.8rem] text-accent-green-light leading-relaxed">
                      {opt.explanation}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {showScore && (
        <div className="mt-4 p-4 rounded-lg bg-bg-tertiary border border-border text-center">
          <span className="text-lg font-bold text-text-primary">
            得分：{score} / {quizItems.length}
          </span>
        </div>
      )}
    </div>
  );
}
