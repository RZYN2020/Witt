import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CapturePopup } from './CapturePopup';
import { useCaptureStore } from '@/stores/useCaptureStore';
import { useLoadingStore } from '@/stores/useLoadingStore';

// Mock the stores
vi.mock('@/stores/useCaptureStore');
vi.mock('@/stores/useLoadingStore');

describe('CapturePopup', () => {
  beforeEach(() => {
    // Mock the store hooks
    (useCaptureStore as vi.Mock).mockReturnValue({
      currentCapture: {
        context: {
          id: '1',
          word_form: 'test',
          sentence: 'This is a test sentence',
          source: { type: 'app', name: 'Manual' },
          created_at: new Date().toISOString(),
        },
        lemma: 'test',
        definitions: [],
        tags: [],
        comment: '',
      },
      isPopupOpen: true,
      isLoading: false,
      error: null,
      closePopup: vi.fn(),
      updateCapture: vi.fn(),
      saveCapture: vi.fn(),
      saveAndNext: vi.fn(),
      discardCapture: vi.fn(),
    });

    (useLoadingStore as vi.Mock).mockReturnValue({
      isLoading: false,
    });
  });

  it('renders correctly when open', () => {
    render(<CapturePopup />);

    // Check if popup is visible
    expect(screen.getByText('📖 Capture Context')).toBeInTheDocument();
    expect(screen.getByText('This is a test sentence')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders error message when there is an error', () => {
    (useCaptureStore as vi.Mock).mockReturnValue({
      ...(useCaptureStore as vi.Mock).mock.results[0].value,
      error: 'Failed to fetch definitions',
    });

    render(<CapturePopup />);

    expect(screen.getByText('Failed to fetch definitions')).toBeInTheDocument();
  });

  it('renders loading indicator when saving', async () => {
    (useCaptureStore as vi.Mock).mockReturnValue({
      ...(useCaptureStore as vi.Mock).mock.results[0].value,
      isLoading: true,
    });

    render(<CapturePopup />);

    // Check if loading indicator is present
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('calls closePopup when close button is clicked', async () => {
    const closePopup = vi.fn();
    (useCaptureStore as vi.Mock).mockReturnValue({
      ...(useCaptureStore as vi.Mock).mock.results[0].value,
      closePopup,
    });

    render(<CapturePopup />);

    fireEvent.click(screen.getByTitle('Close (Esc)'));

    expect(closePopup).toHaveBeenCalled();
  });

  it('renders capture popup with correct structure', () => {
    render(<CapturePopup />);

    // Check main sections
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('📖 Capture Context')).toBeInTheDocument();

    // Check action buttons area exists
    const actionButtonsArea = document.querySelector('.bg-muted\\/50');
    expect(actionButtonsArea).toBeInTheDocument();
  });
});
