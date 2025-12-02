// src/components/shared/MessageSelectionToolbar.tsx
// Toolbar that appears when messages are selected (multi-select mode)

import { X, Forward, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMessageSelection } from '@/contexts/MessageSelectionContext';

interface MessageSelectionToolbarProps {
  onForward: () => void;
  onSelectAll?: () => void;
  totalMessages?: number;
}

/**
 * Message Selection Toolbar
 *
 * Shows when in selection mode with:
 * - Selected count
 * - Cancel button
 * - Select All button
 * - Forward button
 *
 * Example:
 * <MessageSelectionToolbar
 *   onForward={handleForward}
 *   onSelectAll={handleSelectAll}
 *   totalMessages={50}
 * />
 */
export default function MessageSelectionToolbar({
  onForward,
  onSelectAll,
  totalMessages,
}: MessageSelectionToolbarProps) {
  const { exitSelectionMode, getSelectedCount } = useMessageSelection();

  const selectedCount = getSelectedCount();

  return (
    <div className="absolute top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Cancel button + Count */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={exitSelectionMode}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X size={20} />
          </Button>

          <span className="text-lg font-semibold">
            {selectedCount} selected
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Select All */}
          {onSelectAll && totalMessages && selectedCount < totalMessages && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <CheckSquare size={18} className="mr-2" />
              Select All
            </Button>
          )}

          {/* Forward */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onForward}
            disabled={selectedCount === 0}
            className="text-primary-foreground hover:bg-primary-foreground/10 disabled:opacity-50"
          >
            <Forward size={18} className="mr-2" />
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
}
