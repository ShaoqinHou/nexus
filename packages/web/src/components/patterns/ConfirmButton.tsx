import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@web/components/ui';

interface ConfirmButtonProps {
  onConfirm: () => void;
  children: React.ReactNode;
  confirmText?: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export function ConfirmButton({
  onConfirm,
  children,
  confirmText = 'Are you sure?',
  variant = 'destructive',
  size = 'md',
  className,
  disabled = false,
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetConfirm = useCallback(() => {
    setConfirming(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (confirming) {
      resetConfirm();
      onConfirm();
    } else {
      setConfirming(true);
      timerRef.current = setTimeout(() => {
        setConfirming(false);
      }, 3000);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={handleClick}
    >
      {confirming ? confirmText : children}
    </Button>
  );
}
