// src/hooks/useGroupManagement.ts
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { updateMemberRole, transferOwnership } from '@/services/groupService';
import { toast } from '@/utils/toast';
import apiService from '@/services/apiService';
import { CONVERSATION_API } from '@/constants/api/standardApiConstants';

export function useGroupManagement(conversationId: string) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

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

  async function transferOwnershipTo(userId: string) {
    const confirmed = window.confirm(
      'คุณแน่ใจหรือไม่ที่จะโอนความเป็นเจ้าของกลุ่ม?\n\nคุณจะกลายเป็นผู้ดูแลแทน และไม่สามารถยกเลิกได้'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await transferOwnership(conversationId, userId);

      // ✅ Invalidate queries to refresh member list with new ownership
      queryClient.invalidateQueries({ queryKey: ['groupMembers', conversationId] });

      toast.success('โอนความเป็นเจ้าของสำเร็จ');
    } catch (error: any) {
      console.error('Failed to transfer ownership:', error);
      toast.error('ไม่สามารถโอนความเป็นเจ้าของได้', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeMember(userId: string) {
    const confirmed = window.confirm(
      'คุณแน่ใจหรือไม่ที่จะลบสมาชิกคนนี้ออกจากกลุ่ม?'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await apiService.delete(CONVERSATION_API.REMOVE_CONVERSATION_MEMBER(conversationId, userId));

      // ✅ Invalidate queries to refresh member list
      queryClient.invalidateQueries({ queryKey: ['groupMembers', conversationId] });

      toast.success('ลบสมาชิกสำเร็จ');
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      toast.error('ไม่สามารถลบสมาชิกได้', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    promoteToAdmin,
    demoteToMember,
    transferOwnershipTo,
    removeMember,
  };
}
