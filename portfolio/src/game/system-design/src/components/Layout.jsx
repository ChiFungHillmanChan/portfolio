import { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatWidget from './ChatWidget';
import topicData from '../data/topics.json';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const params = useParams();

  // Get current topic info for chat context
  const currentSlug = params.slug || null;
  const currentTopic = currentSlug
    ? topicData.topics.find((t) => t.slug === currentSlug)
    : null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 h-[52px] bg-bg-primary border-b border-border flex items-center px-4 z-30 lg:hidden">
        <button
          className="text-xl text-text-dim hover:text-text-primary transition-colors"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        <span className="ml-3 text-sm font-medium text-text-primary">
          系統架構圖解教室
        </span>
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-[52px] lg:pt-0">
        <Outlet />
      </main>

      {/* Chat Widget */}
      <ChatWidget
        currentTopicSlug={currentSlug}
        currentTopicTitle={currentTopic?.title}
      />
    </div>
  );
}
