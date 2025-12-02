import React from 'react';

/**
 * Animated dots component for typing indicator
 * Shows three dots that bounce in sequence
 */
export const AnimatedDots: React.FC = () => {
  return (
    <span className="inline-flex gap-0.5" role="status" aria-label="typing">
      <span className="w-1 h-1 bg-current rounded-full animate-bounce-dot [animation-delay:0ms]" />
      <span className="w-1 h-1 bg-current rounded-full animate-bounce-dot [animation-delay:150ms]" />
      <span className="w-1 h-1 bg-current rounded-full animate-bounce-dot [animation-delay:300ms]" />
    </span>
  );
};

export default AnimatedDots;
