// src/components/shared/ForwardMessageDialog.tsx
// Using shadcn/ui Dialog pattern

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { forwardService } from '@/services/forwardService';
import { useConversationStore } from '@/stores/conversationStore';
import { toast } from 'sonner';

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageIds: string[];
  onSuccess?: () => void;
}

/**
 * Forward Message Dialog (shadcn/ui pattern)
 */
export default function ForwardMessageDialog({
  open,
  onOpenChange,
  messageIds,
  onSuccess
}: ForwardMessageDialogProps) {
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { conversations } = useConversationStore();

  console.log('[ForwardDialog] Render:', {
    open,
    messageIds,
    selectedConversations,
    conversationsCount: conversations.length,
    buttonDisabled: selectedConversations.length === 0 || loading
  });

  // Toggle conversation selection
  const handleToggle = (conversationId: string) => {
    console.log('[ForwardDialog] Toggle clicked:', conversationId);
    setSelectedConversations((prev) => {
      const newSelection = prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId];
      console.log('[ForwardDialog] New selection:', newSelection);
      return newSelection;
    });
  };

  // Forward messages (using form onSubmit pattern like shadcn example)
  const handleSubmit = async (e: React.FormEvent) => {
    console.log('[ForwardDialog] 🎯 handleSubmit called!', {
      selectedConversations,
      messageIds
    });

    e.preventDefault();

    if (selectedConversations.length === 0) {
      toast.error('Please select at least one conversation');
      return;
    }

    console.log('[ForwardDialog] 🚀 Starting forward...');
    setLoading(true);

    try {
      await forwardService.forwardMessages(messageIds, selectedConversations);

      console.log('[ForwardDialog] ✅ Success!');
      toast.success('Messages forwarded successfully!');

      // Reset state
      setSelectedConversations([]);
      setLoading(false);

      // Call callbacks
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('[ForwardDialog] ❌ Error:', error);
      toast.error('Failed to forward messages');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Forward {messageIds.length} message{messageIds.length > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Select one or more conversations to forward the selected message{messageIds.length > 1 ? 's' : ''} to.
            </DialogDescription>
          </DialogHeader>

          {/* Conversation list */}
          <div className="max-h-[300px] overflow-y-auto border rounded p-2">
            {conversations.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No conversations available
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const isSelected = selectedConversations.includes(conv.id);
                  const name = conv.type === 'group'
                    ? (conv.title || 'Unnamed Group')
                    : (conv.contact_info?.display_name || conv.contact_info?.username || 'Unknown');

                  return (
                    <div
                      key={conv.id}
                      className={`flex items-center gap-3 p-2 rounded ${
                        isSelected ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                    >
                      <Checkbox
                        id={`conv-${conv.id}`}
                        checked={isSelected}
                        onCheckedChange={() => handleToggle(conv.id)}
                      />
                      <label
                        htmlFor={`conv-${conv.id}`}
                        className="flex-1 truncate cursor-pointer"
                      >
                        {name}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected count */}
          {selectedConversations.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedConversations.length} selected
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={selectedConversations.length === 0 || loading}
            >
              {loading ? 'Forwarding...' : `Forward${selectedConversations.length > 0 ? ` (${selectedConversations.length})` : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
