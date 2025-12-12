// src/hooks/useGroupManagement.ts
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { updateMemberRole, transferOwnership } from '@/services/groupService';
import { toast } from '@/utils/toast';
import apiService from '@/services/apiService';
import { CONVERSATION_API } from '@/constants/api/standardApiConstants';

interface ConfirmDialogState {
  type: 'remove' | 'transfer' | null;
  userId: string | null;
  isOpen: boolean;
}

export function useGroupManagement(conversationId: string) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    type: null,
    userId: null,
    isOpen: false,
  });

  // Open confirm dialog
  const openConfirmDialog = useCallback((type: 'remove' | 'transfer', userId: string) => {
    setConfirmDialog({ type, userId, isOpen: true });
  }, []);

  // Close confirm dialog
  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog({ type: null, userId: null, isOpen: false });
  }, []);

  async function promoteToAdmin(userId: string) {
    try {
      setLoading(true);
      await updateMemberRole(conversationId, userId, 'admin');

      // ✅ Invalidate queries to refresh member list with new role
      queryClient.invalidateQueries({ queryKey: ['groupMembers', conversationId] });

      toast.success('เลื่อนเป็นผู้ดูแลสำเร็จ');
    } catch (error: any) {
      console.error('Failed to promote:', error);
      toast.error('ไม่สามารถเลื่อนตำแหน่งได้', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function demoteToMember(userId: string) {
    try {
      setLoading(true);
      await updateMemberRole(conversationId, userId, 'member');

      // ✅ Invalidate queries to refresh member list with new role
      queryClient.invalidateQueries({ queryKey: ['groupMembers', conversationId] });

      toast.success('ลดเป็นสมาชิกสำเร็จ');
    } catch (error: any) {
      console.error('Failed to demote:', error);
      toast.error('ไม่สามารถลดตำแหน่งได้', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  // Request transfer ownership (opens dialog)
  function requestTransferOwnership(userId: string) {
    openConfirmDialog('transfer', userId);
  }

  // Confirm transfer ownership
  async function confirmTransferOwnership() {
    if (!confirmDialog.userId) return;

    try {
      setLoading(true);
      await transferOwnership(conversationId, confirmDialog.userId);

      // ✅ Invalidate queries to refresh member list with new ownership
      queryClient.invalidateQueries({ queryKey: ['groupMembers', conversationId] });

      toast.success('โอนความเป็นเจ้าของสำเร็จ');
    } catch (error: any) {
      console.error('Failed to transfer ownership:', error);
      toast.error('ไม่สามารถโอนความเป็นเจ้าของได้', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
      closeConfirmDialog();
    }
  }

  // Request remove member (opens dialog)
  function requestRemoveMember(userId: string) {
    openConfirmDialog('remove', userId);
  }

  // Confirm remove member
  async function confirmRemoveMember() {
    if (!confirmDialog.userId) return;

    try {
      setLoading(true);
      await apiService.delete(CONVERSATION_API.REMOVE_CONVERSATION_MEMBER(conversationId, confirmDialog.userId));

      // ✅ Invalidate queries to refresh member list
      queryClient.invalidateQueries({ queryKey: ['groupMembers', conversationId] });

      toast.success('ลบสมาชิกสำเร็จ');
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      toast.error('ไม่สามารถลบสมาชิกได้', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
      closeConfirmDialog();
    }
  }

  // Confirm action based on dialog type
  const confirmAction = useCallback(async () => {
    if (confirmDialog.type === 'remove') {
      await confirmRemoveMember();
    } else if (confirmDialog.type === 'transfer') {
      await confirmTransferOwnership();
    }
  }, [confirmDialog.type]);

  return {
    loading,
    promoteToAdmin,
    demoteToMember,
    transferOwnershipTo: requestTransferOwnership,
    removeMember: requestRemoveMember,
    // Dialog state
    confirmDialog,
    closeConfirmDialog,
    confirmAction,
  };
}
