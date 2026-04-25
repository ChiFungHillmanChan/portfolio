import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HUD from '../ui/HUD.jsx';

const baseProps = {
  duration: 300,
  remainingMs: 300_000,
  running: false,
  muted: true,
  onSetDuration: vi.fn(),
  onPlayPause: vi.fn(),
  onReset: vi.fn(),
  onToggleMute: vi.fn(),
};

describe('HUD', () => {
  it('renders all preset chips and highlights the active one', () => {
    render(<HUD {...baseProps} />);
    for (const label of ['1m', '3m', '5m', '10m', '25m', '60m']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: '5m' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking a chip calls onSetDuration with seconds', () => {
    const onSetDuration = vi.fn();
    render(<HUD {...baseProps} onSetDuration={onSetDuration} />);
    fireEvent.click(screen.getByRole('button', { name: '10m' }));
    expect(onSetDuration).toHaveBeenCalledWith(600);
  });

  it('renders remaining time as M:SS for short durations', () => {
    render(<HUD {...baseProps} remainingMs={65_000} />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('renders remaining time as H:MM:SS for ≥1h', () => {
    render(<HUD {...baseProps} remainingMs={3_725_000} />);
    expect(screen.getByText('1:02:05')).toBeInTheDocument();
  });

  it('play button calls onPlayPause when not running', () => {
    const onPlayPause = vi.fn();
    render(<HUD {...baseProps} onPlayPause={onPlayPause} />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(onPlayPause).toHaveBeenCalled();
  });

  it('shows pause icon when running', () => {
    render(<HUD {...baseProps} running={true} />);
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('reset button fires onReset', () => {
    const onReset = vi.fn();
    render(<HUD {...baseProps} onReset={onReset} />);
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(onReset).toHaveBeenCalled();
  });

  it('mute toggle fires onToggleMute', () => {
    const onToggleMute = vi.fn();
    render(<HUD {...baseProps} onToggleMute={onToggleMute} />);
    fireEvent.click(screen.getByRole('button', { name: /mute|sound/i }));
    expect(onToggleMute).toHaveBeenCalled();
  });
});
