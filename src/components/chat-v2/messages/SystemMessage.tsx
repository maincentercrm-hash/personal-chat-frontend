/**
 * SystemMessage - System notification messages (member added/removed, etc.)
 *
 * Displayed centered like DateSeparator, with system styling
 */

import { memo } from 'react';
import type { MessageDTO } from '@/types/message.types';

// ============================================
// Props
// ============================================

interface SystemMessageProps {
  /** Message data */
  message: MessageDTO;
}

// ============================================
// Component
// ============================================

export const SystemMessage = memo(function SystemMessage({ message }: SystemMessageProps) {
  return (
    <div className="flex justify-center py-2">
      <span className="bg-[var(--bubble-system-bg)] text-[var(--bubble-system-text)] text-[13px] px-3 py-1.5 rounded-full text-center max-w-[80%]">
        {message.content}
      </span>
    </div>
  );
});

export default SystemMessage;
