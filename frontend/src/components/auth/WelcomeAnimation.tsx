'use client';

import React, { useEffect, useState } from 'react';

interface WelcomeAnimationProps {
  onComplete?: () => void;
  durationMs?: number;
}

const LETTERS = ['H', 'e', 'l', 'l', 'o'];

export default function WelcomeAnimation({
  onComplete,
  durationMs = 1800,
}: WelcomeAnimationProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [showSubtext, setShowSubtext] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Detect reduced motion preference
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setPrefersReducedMotion(true);
      setVisibleCount(LETTERS.length);
      setShowSubtext(true);

      const endTimer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          onComplete?.();
        }, 250);
      }, 1200);

      return () => clearTimeout(endTimer);
    }

    // Sequence for standard motion:
    // Stagger letters: 100ms, 190ms, 280ms, 370ms, 460ms
    const timers: NodeJS.Timeout[] = [];

    LETTERS.forEach((_, index) => {
      timers.push(
        setTimeout(() => {
          setVisibleCount((prev) => Math.max(prev, index + 1));
        }, 100 + index * 90)
      );
    });

    // Fade in "Logged in successfully!" right below it at 620ms
    timers.push(
      setTimeout(() => {
        setShowSubtext(true);
      }, 620)
    );

    // Fade out whole screen at (durationMs - 300ms)
    timers.push(
      setTimeout(() => {
        setFadeOut(true);
      }, Math.max(durationMs - 300, 1400))
    );

    // Complete callback at durationMs
    timers.push(
      setTimeout(() => {
        onComplete?.();
      }, durationMs)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [durationMs, onComplete]);

  return (
    <div
      aria-live="polite"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg text-ink transition-opacity duration-300 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center justify-center space-y-2 select-none">
        {/* Simple & understated cursive "Hello" — constant size, normal weight, no scale/glow */}
        <div className="font-cursive font-normal text-4xl sm:text-5xl text-ink leading-none tracking-normal flex">
          {LETTERS.map((letter, index) => {
            const isVisible = visibleCount > index;

            if (prefersReducedMotion) {
              return (
                <span key={index} className="inline-block">
                  {letter}
                </span>
              );
            }

            return (
              <span
                key={index}
                className={`inline-block transition-all duration-200 ease-out ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-1'
                }`}
              >
                {letter}
              </span>
            );
          })}
        </div>

        {/* Small, simple, plain Inter font */}
        <p
          className={`font-sans font-normal text-xs sm:text-sm text-ink-muted transition-opacity duration-300 ${
            showSubtext ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Logged in successfully!
        </p>
      </div>
    </div>
  );
}
