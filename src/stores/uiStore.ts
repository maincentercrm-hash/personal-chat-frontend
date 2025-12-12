// src/stores/uiStore.ts
/**
 * UI Store - Manages UI-only state that doesn't need to be persisted
 *
 * Separation of concerns:
 * - uiStore: UI state (editing, replying, selection, modals)
 * - messageStore: Message data only
 * - conversationStore: Conversation data only
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

interface ReplyingTo {
  id: string;
  text: string;
  sender: string;
  senderName?: string;
}

interface EditingMessage {
  id: string;
  content: string;
  conversationId?: string;
}

interface UIState {
  // Reply state
  replyingTo: ReplyingTo | null;

  // Edit state
  editingMessage: EditingMessage | null;

  // Selection state (for multi-select/forward)
  selectedMessageIds: string[];
  isSelectionMode: boolean;

  // Jump to message state
  highlightedMessageId: string | null;
  jumpTargetMessageId: string | null;

  // Loading states
  isSending: boolean;
  isUploading: boolean;
  uploadProgress: number;

  // Sheet/Modal states
  isMediaViewerOpen: boolean;
  mediaViewerIndex: number;

  // Actions
  setReplyingTo: (replyingTo: ReplyingTo | null) => void;
  setEditingMessage: (editingMessage: EditingMessage | null) => void;

  // Selection actions
  toggleMessageSelection: (messageId: string) => void;
  selectMessage: (messageId: string) => void;
  deselectMessage: (messageId: string) => void;
  clearSelection: () => void;
  setSelectionMode: (isSelectionMode: boolean) => void;

  // Jump/Highlight actions
  setHighlightedMessageId: (messageId: string | null) => void;
  setJumpTargetMessageId: (messageId: string | null) => void;
  clearHighlight: () => void;

  // Loading actions
  setIsSending: (isSending: boolean) => void;
  setIsUploading: (isUploading: boolean) => void;
  setUploadProgress: (progress: number) => void;

  // Media viewer actions
  openMediaViewer: (index: number) => void;
  closeMediaViewer: () => void;
  setMediaViewerIndex: (index: number) => void;

  // Clear all UI state (e.g., when changing conversation)
  clearUIState: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      // Initial state
      replyingTo: null,
      editingMessage: null,
      selectedMessageIds: [],
      isSelectionMode: false,
      highlightedMessageId: null,
      jumpTargetMessageId: null,
      isSending: false,
      isUploading: false,
      uploadProgress: 0,
      isMediaViewerOpen: false,
      mediaViewerIndex: 0,

      // Reply actions
      setReplyingTo: (replyingTo) => {
        console.log('[UIStore] setReplyingTo:', replyingTo);
        set({ replyingTo, editingMessage: null }); // Clear edit when replying
      },

      // Edit actions
      setEditingMessage: (editingMessage) => {
        console.log('[UIStore] setEditingMessage:', editingMessage);
        set({ editingMessage, replyingTo: null }); // Clear reply when editing
      },

      // Selection actions
      toggleMessageSelection: (messageId) => {
        set((state) => {
          const isSelected = state.selectedMessageIds.includes(messageId);
          const newSelectedIds = isSelected
            ? state.selectedMessageIds.filter(id => id !== messageId)
            : [...state.selectedMessageIds, messageId];

          return {
            selectedMessageIds: newSelectedIds,
            isSelectionMode: newSelectedIds.length > 0
          };
        });
      },

      selectMessage: (messageId) => {
        set((state) => {
          if (state.selectedMessageIds.includes(messageId)) {
            return state;
          }
          return {
            selectedMessageIds: [...state.selectedMessageIds, messageId],
            isSelectionMode: true
          };
        });
      },

      deselectMessage: (messageId) => {
        set((state) => {
          const newSelectedIds = state.selectedMessageIds.filter(id => id !== messageId);
          return {
            selectedMessageIds: newSelectedIds,
            isSelectionMode: newSelectedIds.length > 0
          };
        });
      },

      clearSelection: () => {
        set({
          selectedMessageIds: [],
          isSelectionMode: false
        });
      },

      setSelectionMode: (isSelectionMode) => {
        set((state) => ({
          isSelectionMode,
          selectedMessageIds: isSelectionMode ? state.selectedMessageIds : []
        }));
      },

      // Jump/Highlight actions
      setHighlightedMessageId: (messageId) => {
        set({ highlightedMessageId: messageId });

        // Auto-clear highlight after 2 seconds
        if (messageId) {
          setTimeout(() => {
            set((state) => {
              // Only clear if it's still the same message
              if (state.highlightedMessageId === messageId) {
                return { highlightedMessageId: null };
              }
              return state;
            });
          }, 2000);
        }
      },

      setJumpTargetMessageId: (messageId) => {
        set({ jumpTargetMessageId: messageId });
      },

      clearHighlight: () => {
        set({
          highlightedMessageId: null,
          jumpTargetMessageId: null
        });
      },

      // Loading actions
      setIsSending: (isSending) => set({ isSending }),
      setIsUploading: (isUploading) => set({ isUploading }),
      setUploadProgress: (progress) => set({ uploadProgress: progress }),

      // Media viewer actions
      openMediaViewer: (index) => {
        set({
          isMediaViewerOpen: true,
          mediaViewerIndex: index
        });
      },

      closeMediaViewer: () => {
        set({
          isMediaViewerOpen: false,
          mediaViewerIndex: 0
        });
      },

      setMediaViewerIndex: (index) => set({ mediaViewerIndex: index }),

      // Clear all UI state
      clearUIState: () => {
        set({
          replyingTo: null,
          editingMessage: null,
          selectedMessageIds: [],
          isSelectionMode: false,
          highlightedMessageId: null,
          jumpTargetMessageId: null,
          isSending: false,
          isUploading: false,
          uploadProgress: 0,
          isMediaViewerOpen: false,
          mediaViewerIndex: 0
        });
      }
    }),
    {
      name: 'UIStore',
      enabled: import.meta.env.DEV
    }
  )
);

// ============================================================================
// Selectors - Use these for performance optimization
// ============================================================================

export const uiSelectors = {
  // Reply state
  replyingTo: (state: UIState) => state.replyingTo,

  // Edit state
  editingMessage: (state: UIState) => state.editingMessage,

  // Selection state
  selectedMessageIds: (state: UIState) => state.selectedMessageIds,
  isSelectionMode: (state: UIState) => state.isSelectionMode,
  selectedCount: (state: UIState) => state.selectedMessageIds.length,
  isMessageSelected: (messageId: string) => (state: UIState) =>
    state.selectedMessageIds.includes(messageId),

  // Highlight state
  highlightedMessageId: (state: UIState) => state.highlightedMessageId,
  jumpTargetMessageId: (state: UIState) => state.jumpTargetMessageId,

  // Loading state
  isSending: (state: UIState) => state.isSending,
  isUploading: (state: UIState) => state.isUploading,
  uploadProgress: (state: UIState) => state.uploadProgress,

  // Media viewer
  isMediaViewerOpen: (state: UIState) => state.isMediaViewerOpen,
  mediaViewerIndex: (state: UIState) => state.mediaViewerIndex,
};

// ============================================================================
// Actions selector - Stable reference
// ============================================================================

export const uiActions = (state: UIState) => ({
  setReplyingTo: state.setReplyingTo,
  setEditingMessage: state.setEditingMessage,
  toggleMessageSelection: state.toggleMessageSelection,
  selectMessage: state.selectMessage,
  deselectMessage: state.deselectMessage,
  clearSelection: state.clearSelection,
  setSelectionMode: state.setSelectionMode,
  setHighlightedMessageId: state.setHighlightedMessageId,
  setJumpTargetMessageId: state.setJumpTargetMessageId,
  clearHighlight: state.clearHighlight,
  setIsSending: state.setIsSending,
  setIsUploading: state.setIsUploading,
  setUploadProgress: state.setUploadProgress,
  openMediaViewer: state.openMediaViewer,
  closeMediaViewer: state.closeMediaViewer,
  setMediaViewerIndex: state.setMediaViewerIndex,
  clearUIState: state.clearUIState,
});

export default useUIStore;
