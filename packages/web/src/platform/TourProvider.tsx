import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { TourOverlay } from '@web/components/ui/TourOverlay';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TourStep {
  id: string;
  target: string; // CSS selector like '[data-tour="add-category"]' or 'center'
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  route?: string; // navigate to this route before showing step
  actionLabel?: string;
  waitForSelector?: string; // wait for this element before showing
}

interface TourContextValue {
  startTour: (steps: TourStep[], tourId?: string) => void;
  endTour: () => void;
  nextStep: () => void;
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
}

const TourContext = createContext<TourContextValue | null>(null);

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'nexus_tours_completed';

function getCompletedTours(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function markTourCompleted(tourId: string): void {
  try {
    const completed = getCompletedTours();
    if (!completed.includes(tourId)) {
      completed.push(tourId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    }
  } catch {
    // localStorage may be unavailable
  }
}

export function isTourCompleted(tourId: string): boolean {
  return getCompletedTours().includes(tourId);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const MAX_POLL_ATTEMPTS = 50; // 50 * 60ms = 3s max wait
const POLL_INTERVAL = 60;

interface TourProviderProps {
  children: ReactNode;
  tenantSlug?: string;
}

export function TourProvider({ children, tenantSlug }: TourProviderProps) {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isActive, setIsActive] = useState(false);
  const tourIdRef = useRef<string>('');

  const navigate = useNavigate();
  const location = useLocation();
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Find and track target element position
  const updateTargetRect = useCallback((selector: string) => {
    if (selector === 'center') {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);

      // Scroll element into view if needed
      const inView =
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.left >= 0 &&
        rect.right <= window.innerWidth;
      if (!inView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Re-measure after scroll
        setTimeout(() => {
          setTargetRect(el.getBoundingClientRect());
        }, 400);
      }
    }
  }, []);

  // Recalculate position on scroll/resize
  useEffect(() => {
    if (!isActive || !steps[currentIdx]) return;
    const selector = steps[currentIdx].target;
    if (selector === 'center') return;

    const handleReposition = () => {
      rafRef.current = requestAnimationFrame(() => {
        updateTargetRect(selector);
      });
    };

    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, currentIdx, steps, updateTargetRect]);

  // Poll for target element
  const pollForTarget = useCallback(
    (selector: string, waitSelector?: string) => {
      const waitFor = waitSelector ?? selector;
      if (waitFor === 'center') {
        setTargetRect(null);
        return;
      }

      let attempts = 0;
      const poll = () => {
        const el = document.querySelector(waitFor);
        if (el) {
          updateTargetRect(selector === 'center' ? 'center' : selector);
          return;
        }
        attempts += 1;
        if (attempts < MAX_POLL_ATTEMPTS) {
          pollRef.current = setTimeout(poll, POLL_INTERVAL);
        }
      };
      poll();
    },
    [updateTargetRect],
  );

  // Show a specific step
  const showStep = useCallback(
    (idx: number, stepsArr: TourStep[]) => {
      const step = stepsArr[idx];
      if (!step) return;

      setCurrentIdx(idx);

      // Build the full route path if the step has a route
      if (step.route && tenantSlug) {
        const fullRoute = `/t/${tenantSlug}${step.route}`;
        const currentPath = location.pathname;

        // Check if we need to navigate (strip basepath for comparison)
        const basepath = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
        const normalizedCurrent = basepath ? currentPath.replace(basepath, '') : currentPath;

        if (!normalizedCurrent.startsWith(fullRoute)) {
          void navigate({ to: fullRoute });
          // After navigation, give React time to render, then poll for the target
          setTimeout(() => {
            pollForTarget(step.target, step.waitForSelector);
          }, 300);
          return;
        }
      }

      // No navigation needed, poll for target
      pollForTarget(step.target, step.waitForSelector);
    },
    [tenantSlug, location.pathname, navigate, pollForTarget],
  );

  const startTour = useCallback(
    (tourSteps: TourStep[], tourId?: string) => {
      if (tourSteps.length === 0) return;
      const id = tourId ?? tourSteps[0].id;
      tourIdRef.current = id;
      setSteps(tourSteps);
      setCurrentIdx(0);
      setIsActive(true);
      // Delay slightly so state is set before showing
      requestAnimationFrame(() => {
        showStep(0, tourSteps);
      });
    },
    [showStep],
  );

  const endTour = useCallback(() => {
    setIsActive(false);
    setSteps([]);
    setCurrentIdx(0);
    setTargetRect(null);
    if (tourIdRef.current) {
      markTourCompleted(tourIdRef.current);
    }
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);

  const nextStep = useCallback(() => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= steps.length) {
      endTour();
      return;
    }
    showStep(nextIdx, steps);
  }, [currentIdx, steps, showStep, endTour]);

  const currentStepData = isActive ? steps[currentIdx] : null;

  return (
    <TourContext.Provider
      value={{
        startTour,
        endTour,
        nextStep,
        isActive,
        currentStep: currentIdx,
        totalSteps: steps.length,
      }}
    >
      {children}
      {isActive && currentStepData && (
        <TourOverlay
          key={currentStepData.id}
          targetRect={targetRect}
          title={currentStepData.title}
          description={currentStepData.description}
          step={currentIdx}
          total={steps.length}
          placement={currentStepData.placement}
          onNext={nextStep}
          onSkip={endTour}
          actionLabel={currentStepData.actionLabel}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
