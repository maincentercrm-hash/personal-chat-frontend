/**
 * MessageContextMenu - Right-click/long-press menu for messages
 *
 * Features:
 * - Reply, Edit, Delete, Copy, Forward actions
 * - Different options for own vs others' messages
 * - Selection mode entry
 * - Accessible keyboard navigation
 */

import { memo, useCallback, useEffect, useRef } from 'react';
import {
  Reply,
  Pencil,
  Copy,
  Trash2,
  Forward,
  CheckSquare,
  RotateCcw,
  Pin,
  PinOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface MessageContextMenuProps {
  /** Position to display menu */
  position: ContextMenuPosition;

  /** Is own message */
  isOwn: boolean;

  /** Message content for copy */
  content?: string;

  /** Message is failed (show resend) */
  isFailed?: boolean;

  /** Close menu */
  onClose: () => void;

  /** Is message pinned */
  isPinned?: boolean;

  /** Action handlers */
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onForward?: () => void;
  onResend?: () => void;
  onSelect?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
}

// ============================================
// Menu Item
// ============================================

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

const MenuItem = memo(function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2',
        'text-left text-sm',
        'hover:bg-accent transition-colors',
        danger ? 'text-red-500 hover:text-red-600' : 'text-foreground'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
});

// ============================================
// Main Component
// ============================================

export const MessageContextMenu = memo(function MessageContextMenu({
  position,
  isOwn,
  content,
  isFailed,
  isPinned,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onCopy,
  onForward,
  onResend,
  onSelect,
  onPin,
  onUnpin,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // Adjust if overflowing right
    if (position.x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 8;
    }

    // Adjust if overflowing bottom
    if (position.y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 8;
    }

    // Ensure not negative
    adjustedX = Math.max(8, adjustedX);
    adjustedY = Math.max(8, adjustedY);

    menuRef.current.style.left = `${adjustedX}px`;
    menuRef.current.style.top = `${adjustedY}px`;
  }, [position]);

  // Action handlers that close menu after action
  const handleAction = useCallback(
    (action?: () => void) => {
      if (action) {
        action();
      }
      onClose();
    },
    [onClose]
  );

  const iconSize = 16;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        ref={menuRef}
        className={cn(
          'fixed z-50 min-w-[180px]',
          'bg-background border rounded-lg shadow-lg',
          'py-1 overflow-hidden',
          'animate-in fade-in zoom-in-95 duration-100'
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Reply */}
        {onReply && (
          <MenuItem
            icon={<Reply size={iconSize} />}
            label="ตอบกลับ"
            onClick={() => handleAction(onReply)}
          />
        )}

        {/* Resend (failed messages) */}
        {isFailed && onResend && (
          <MenuItem
            icon={<RotateCcw size={iconSize} />}
            label="ส่งอีกครั้ง"
            onClick={() => handleAction(onResend)}
          />
        )}

        {/* Edit (own messages only) */}
        {isOwn && onEdit && (
          <MenuItem
            icon={<Pencil size={iconSize} />}
            label="แก้ไข"
            onClick={() => handleAction(onEdit)}
          />
        )}

        {/* Copy (if has content) */}
        {content && onCopy && (
          <MenuItem
            icon={<Copy size={iconSize} />}
            label="คัดลอก"
            onClick={() => handleAction(onCopy)}
          />
        )}

        {/* Forward */}
        {onForward && (
          <MenuItem
            icon={<Forward size={iconSize} />}
            label="ส่งต่อ"
            onClick={() => handleAction(onForward)}
          />
        )}

        {/* Pin / Unpin */}
        {isPinned && onUnpin ? (
          <MenuItem
            icon={<PinOff size={iconSize} />}
            label="เลิกปักหมุด"
            onClick={() => handleAction(onUnpin)}
          />
        ) : onPin ? (
          <MenuItem
            icon={<Pin size={iconSize} />}
            label="ปักหมุด"
            onClick={() => handleAction(onPin)}
          />
        ) : null}

        {/* Select */}
        {onSelect && (
          <MenuItem
            icon={<CheckSquare size={iconSize} />}
            label="เลือก"
            onClick={() => handleAction(onSelect)}
          />
        )}

        {/* Divider before delete */}
        {isOwn && onDelete && (
          <div className="border-t my-1" />
        )}

        {/* Delete (own messages only) */}
        {isOwn && onDelete && (
          <MenuItem
            icon={<Trash2 size={iconSize} />}
            label="ลบ"
            onClick={() => handleAction(onDelete)}
            danger
          />
        )}
      </div>
    </>
  );
});

export default MessageContextMenu;
