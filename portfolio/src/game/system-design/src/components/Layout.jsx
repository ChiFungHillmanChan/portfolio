import { useState, useCallback, useRef, useEffect } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatWidget from './ChatWidget';
import topicData from '../data/topics.json';

const DESKTOP_COLLAPSED_KEY = 'sd-desktop-sidebar-collapsed';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    try { return localStorage.getItem(DESKTOP_COLLAPSED_KEY) === 'true'; } catch { return false; }
  });
  const [filter, setFilter] = useState('all');
  const params = useParams();
  const location = useLocation();

  // Track whether navigation was triggered by sidebar click
  const justNavigatedRef = useRef(false);
  const [scrollToSlug, setScrollToSlug] = useState(null);

  const toggleDesktopSidebar = useCallback(() => {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(DESKTOP_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  // Get current topic info for chat context
  const currentSlug = params.slug || null;
  const currentTopic = currentSlug
    ? topicData.topics.find((t) => t.slug === currentSlug)
    : null;

  // Detect direct URL navigation (not from sidebar click)
  useEffect(() => {
    if (!currentSlug) return;
    if (justNavigatedRef.current) {
      // Navigation came from sidebar click — reset flag, no auto-open
      justNavigatedRef.current = false;
      return;
    }
    // Direct URL navigation — open sidebar on mobile + trigger scroll
    const isMobile = window.innerWidth < 1024;
    if (isMobile) setSidebarOpen(true);
    setScrollToSlug(currentSlug);
  }, [currentSlug]);

  const handleSidebarNavigate = useCallback(() => {
    justNavigatedRef.current = true;
  }, []);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Top header bar — always visible on mobile, visible on desktop only when sidebar collapsed */}
      <div className={`fixed top-0 left-0 right-0 h-[52px] bg-bg-primary border-b border-border flex items-center px-4 z-30 ${desktopCollapsed ? '' : 'lg:hidden'}`}>
        {/* Mobile hamburger */}
        <button
          className="text-xl text-text-dim hover:text-text-primary transition-colors lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
        {/* Desktop expand button — only when sidebar collapsed */}
        {desktopCollapsed && (
          <button
            className="text-xl text-text-dim hover:text-text-primary transition-colors hidden lg:flex"
            onClick={toggleDesktopSidebar}
          >
            ☰
          </button>
        )}
        <span className="ml-3 text-sm font-medium text-text-primary">
          系統架構圖解教室
        </span>
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        desktopCollapsed={desktopCollapsed}
        onToggleDesktop={toggleDesktopSidebar}
        filter={filter}
        onFilterChange={setFilter}
        scrollToSlug={scrollToSlug}
        onScrollComplete={() => setScrollToSlug(null)}
        onNavigate={handleSidebarNavigate}
      />

      {/* Main content */}
      <main className={`flex-1 overflow-y-auto pt-[52px] ${desktopCollapsed ? '' : 'lg:pt-0'}`}>
        <Outlet context={{ filter }} />
      </main>

      {/* Chat Widget — hidden on coaching page which has its own chat */}
      <ChatWidget
        currentTopicSlug={currentSlug}
        currentTopicTitle={currentTopic?.title}
        hidden={location.pathname.startsWith('/coaching')}
      />
    </div>
  );
}
