import React from 'react';
import { LEGAL_UPDATED } from './legal';

// 一份細字文件 render 出嚟。書末頁同封面 sheet 共用呢個 component，所以兩邊
// 睇到嘅字永遠一模一樣 —— 冇得一邊改咗另一邊唔記得。
export function LegalBody({ doc }) {
  return (
    <article className="shb-legal">
      <p className="shb-legal-updated">最後更新：{LEGAL_UPDATED}</p>
      {doc.sections.map((s) => (
        <section key={s.h}>
          <h4>{s.h}</h4>
          {s.p.map((para, i) => (typeof para === 'string'
            ? <p key={i}>{para}</p>
            : <p key={i} className="shb-legal-warn">{para.warn}</p>))}
        </section>
      ))}
    </article>
  );
}

// 封面（未登入）撳「條款」／「私隱」彈出嚟嘅 sheet。你未同意之前就睇得到 ——
// 一份要登入咗先睇到嘅私隱條款根本唔算私隱條款。
export default function LegalSheet({ doc, onClose }) {
  return (
    <div className="shb-sheet-mask" onClick={onClose}>
      <div className="shb-sheet" onClick={(e) => e.stopPropagation()}>
        <h3>{doc.title}</h3>
        <div className="shb-legal-scroll"><LegalBody doc={doc} /></div>
        <div className="shb-sheet-actions">
          <button type="button" className="shb-big-btn" onClick={onClose}>收埋</button>
        </div>
      </div>
    </div>
  );
}
