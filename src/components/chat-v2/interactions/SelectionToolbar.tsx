/**
 * SelectionToolbar - Bottom toolbar when messages are selected
 *
 * Features:
 * - Shows count of selected messages
 * - Delete, Forward, Copy actions
 * - Cancel button to exit selection mode
 */

import { memo } from 'react';
import { X, Trash2, Forward, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface SelectionToolbarProps {
  /** Number of selected messages */
  selectedCount: number;

  /** Close selection mode */
  onClose: () => void;

  /** Action handlers */
  onDelete?: () => void;
  onForward?: () => void;
  onCopy?: () => void;
}

// ============================================
// Action Button
// ============================================

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

const ActionButton = memo(function ActionButton({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-1 p-2 min-w-[60px]',
        'rounded-lg transition-colors',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
          : 'text-foreground hover:bg-accent'
      )}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
});

// ============================================
// Main Component
// ============================================

export const SelectionToolbar = memo(function SelectionToolbar({
  selectedCount,
  onClose,
  onDelete,
  onForward,
  onCopy,
}: SelectionToolbarProps) {
  const iconSize = 20;

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[90]',
        'bg-background border-t shadow-lg',
        'px-4 py-3',
        'animate-in slide-in-from-bottom duration-200'
      )}
    >
      <div className="flex items-center justify-between max-w-screen-lg mx-auto">
        {/* Close button and count */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-full',
              'hover:bg-accent transition-colors'
            )}
            aria-label="ยกเลิกการเลือก"
          >
            <X size={iconSize} />
          </button>

          <span className="text-sm font-medium">
            เลือก {selectedCount} ข้อความ
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Copy */}
          {onCopy && (
            <ActionButton
              icon={<Copy size={iconSize} />}
              label="คัดลอก"
              onClick={onCopy}
              disabled={selectedCount === 0}
            />
          )}

          {/* Forward */}
          {onForward && (
            <ActionButton
              icon={<Forward size={iconSize} />}
              label="ส่งต่อ"
              onClick={onForward}
              disabled={selectedCount === 0}
            />
          )}

          {/* Delete */}
          {onDelete && (
            <ActionButton
              icon={<Trash2 size={iconSize} />}
              label="ลบ"
              onClick={onDelete}
              danger
              disabled={selectedCount === 0}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default SelectionToolbar;
