import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NavigationProvider, useNavigation } from '@/contexts/NavigationContext';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component to access navigation context
function TestComponent() {
  const { state, toggleSidebar, setSidebarOpen } = useNavigation();

  return (
    <div>
      <div data-testid="sidebar-status">{state.sidebarOpen ? 'open' : 'closed'}</div>
      <button data-testid="toggle-sidebar" onClick={toggleSidebar}>
        Toggle Sidebar
      </button>
      <button data-testid="close-sidebar" onClick={() => setSidebarOpen(false)}>
        Close Sidebar
      </button>
    </div>
  );
}

describe('NavigationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('provides default navigation state', () => {
    render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    );

    expect(screen.getByTestId('sidebar-status')).toHaveTextContent('open');
  });

  it('toggles sidebar state', () => {
    render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    );

    const toggleButton = screen.getByTestId('toggle-sidebar');
    const statusElement = screen.getByTestId('sidebar-status');

    expect(statusElement).toHaveTextContent('open');

    fireEvent.click(toggleButton);
    expect(statusElement).toHaveTextContent('closed');

    fireEvent.click(toggleButton);
    expect(statusElement).toHaveTextContent('open');
  });

  it('closes sidebar when setSidebarOpen(false) is called', () => {
    render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    );

    const closeButton = screen.getByTestId('close-sidebar');
    const statusElement = screen.getByTestId('sidebar-status');

    expect(statusElement).toHaveTextContent('open');

    fireEvent.click(closeButton);
    expect(statusElement).toHaveTextContent('closed');
  });

  it('loads preferences from localStorage', () => {
    const savedPreferences = JSON.stringify({
      sidebarOpen: false,
      theme: 'dark',
      compactMode: true,
      showBadges: false,
    });

    localStorageMock.getItem.mockReturnValue(savedPreferences);

    render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    );

    expect(screen.getByTestId('sidebar-status')).toHaveTextContent('closed');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('nexus-navigation-preferences');
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    render(
      <NavigationProvider>
        <TestComponent />
      </NavigationProvider>
    );

    // Should still render with default state
    expect(screen.getByTestId('sidebar-status')).toHaveTextContent('open');
  });
});
