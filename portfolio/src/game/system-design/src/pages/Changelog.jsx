import { useState } from 'react';
import changelogData from '../data/changelog.json';

export default function Changelog() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">📋 更新日誌</h1>
      <div className="space-y-8">
        {changelogData.map((release, i) => (
          <div key={i} className="border border-gray-700 rounded-xl p-6 bg-gray-800/50">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono bg-indigo-600/30 text-indigo-300 px-2 py-1 rounded">
                v{release.version}
              </span>
              <span className="text-sm text-gray-400">{release.date}</span>
            </div>
            <h2 className="text-lg font-semibold text-white mb-3">{release.title}</h2>
            <ul className="space-y-2">
              {release.entries.map((entry, j) => (
                <li key={j} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>{entry}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
