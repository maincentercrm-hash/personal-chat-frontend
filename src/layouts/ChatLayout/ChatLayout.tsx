import * as React from "react"
import { Outlet, useParams, useNavigate } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"

import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { WebSocketProvider } from "@/contexts/WebSocketContext"
import WebSocketManager from "@/services/websocket/WebSocketManager"
import { MessageJumpProvider, useMessageJump } from "@/contexts/MessageJumpContext"
import useUser from "@/hooks/useUser"
import useConversationStore from "@/stores/conversationStore"
import { useFriendship } from "@/hooks/useFriendship"
import { useMentionNotification } from "@/hooks/useMentionNotification"
import { useNoteWebSocket } from "@/hooks/useNoteWebSocket"
import { useEffect, useState, useMemo } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreVertical, User, AlertCircle, ArrowLeft } from "lucide-react"
import { useIsMobile } from "@/hooks/useMediaQuery"
import { ConversationDetailsSheet } from "@/components/standard/conversation/ConversationDetailsSheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/utils/toast"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"

/**
 * ChatLayoutContent - Inner component with hooks
 * ใช้ store โดยตรงแทน useConversation เพื่อหลีกเลี่ยง duplicate WebSocket listeners
 */
function ChatLayoutContent() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { currentUser, getCurrentUser } = useUser()
  const isMobile = useIsMobile()

  // ✅ Register friendship WebSocket event listeners (block/unblock events)
  useFriendship()

  // ✅ Register mention notification listener
  useMentionNotification()

  // ✅ Register note WebSocket event listeners (shared notes real-time sync)
  useNoteWebSocket()

  // ✅ ใช้ store โดยตรงแทน useConversation (เพื่อหลีกเลี่ยง duplicate listeners)
  const conversations = useConversationStore(state => state.conversations)
  const fetchConversations = useConversationStore(state => state.fetchConversations)
  const togglePinConversation = useConversationStore(state => state.togglePinConversation)
  const toggleMuteConversation = useConversationStore(state => state.toggleMuteConversation)
  const deleteConversation = useConversationStore(state => state.deleteConversation)

  const [showConversationDetails, setShowConversationDetails] = useState(false)
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { jumpToMessage } = useMessageJump()

  useEffect(() => {
    if (!currentUser) {
      getCurrentUser()
    }
  }, [currentUser, getCurrentUser])

  // Fetch conversations on mount
  useEffect(() => {
   // console.log('🔄 [ChatLayout] Fetching conversations from API...')
    fetchConversations()
  }, [fetchConversations])

  // ✅ FIX: Subscribe to ALL conversations for real-time updates
  // Backend only auto-subscribes to first 5 conversations, so we subscribe to all
  useEffect(() => {
    if (conversations.length > 0) {
      console.log('[ChatLayout] Subscribing to all conversations:', conversations.length)
      conversations.forEach(conv => {
        WebSocketManager.subscribeToConversation(conv.id)
      })
    }
  }, [conversations])

  const user = currentUser
    ? {
        name: currentUser.display_name || "Guest",
        email: currentUser.email || "",
        avatar: currentUser.profile_image_url || "",
      }
    : undefined

  const handleSelectConversation = (id: string) => {
    console.log('[ChatLayout] handleSelectConversation called with id:', id)
    navigate(`/chat/${id}`, { replace: false })
  }

  // ✅ Context menu handler - ลบการสนทนา (แสดง confirmation dialog)
  const handleDelete = React.useCallback((conversationId: string) => {
    setDeletingConversation(conversationId)
  }, [])

  // ✅ Confirm delete conversation
  const confirmDeleteConversation = React.useCallback(async () => {
    if (!deletingConversation || !currentUser) return

    setIsDeleting(true)
    try {
      const success = await deleteConversation(deletingConversation, currentUser.id)

      if (success) {
        // Get conversation type for appropriate message
        const conversation = conversations.find(c => c.id === deletingConversation)
        const isGroup = conversation?.type === 'group'

        toast.success(
          isGroup ? 'ออกจากกลุ่มสำเร็จ' : 'ลบแชทสำเร็จ',
          isGroup ? 'คุณได้ออกจากกลุ่มแล้ว' : 'แชทจะไม่แสดงในรายการอีกต่อไป'
        )

        // Navigate to chat dashboard if deleting active conversation
        if (conversationId === deletingConversation) {
          navigate('/chat')
        }
      } else {
        toast.error('ไม่สามารถดำเนินการได้', 'โปรดลองอีกครั้ง')
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบแชทได้')
    } finally {
      setIsDeleting(false)
      setDeletingConversation(null)
    }
  }, [deletingConversation, currentUser, deleteConversation, conversations, conversationId, navigate])

  // Get active conversation
  const activeChat = conversationId ? conversations.find(c => c.id === conversationId) : null
  const currentUserId = currentUser?.id || ''

  // ✅ ดึง userId ของคู่สนทนา (สำหรับแชท direct เท่านั้น)
  const chatPartnerUserId = useMemo(() => {
    if (!activeChat || activeChat.type !== 'direct' || !activeChat.contact_info) {
      return null
    }
    return activeChat.contact_info.user_id
  }, [activeChat])

  // ✅ ดึง userId ทั้งหมดจาก conversations ที่เป็น direct chat (สำหรับ sidebar)
  const allDirectChatUserIds = useMemo(() => {
    return conversations
      .filter(conv => conv.type === 'direct' && conv.contact_info?.user_id)
      .map(conv => conv.contact_info!.user_id)
  }, [conversations])

  // ✅ ใช้ useOnlineStatus เพื่อเช็คสถานะออนไลน์ของทุกคนใน conversation list
  const { isUserOnline } = useOnlineStatus(allDirectChatUserIds)

  // Debug logging
  useEffect(() => {
    console.log('[ChatLayout] Debug:', {
      isMobile,
      conversationId,
      shouldShowBackButton: isMobile && conversationId,
      currentPath: window.location.pathname
    })
  }, [isMobile, conversationId])

  // Debug: Track conversationId changes
  useEffect(() => {
    console.log('[ChatLayout] conversationId changed to:', conversationId)
  }, [conversationId])

  // ✅ FIX: Subscribe to conversation when opening it (for message.receive events)
  // Backend only auto-subscribes to first 5 conversations, so we need to manually subscribe
  useEffect(() => {
    if (conversationId) {
      console.log('[ChatLayout] Subscribing to conversation:', conversationId)
      WebSocketManager.subscribeToConversation(conversationId)
    }
  }, [conversationId])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "19rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        user={user}
        conversations={conversations}
        activeConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onTogglePin={togglePinConversation}
        onToggleMute={toggleMuteConversation}
        isUserOnline={isUserOnline}
        onDelete={handleDelete}
      />
      <SidebarInset className="pb-16 md:pb-0">
        {/* Header with SidebarTrigger and Chat Info */}
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 border-b">
          {/* Mobile: Back button when in conversation, Hamburger when in list */}
          {isMobile && conversationId ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                console.log('[ChatLayout] Back button clicked')
                console.log('[ChatLayout] Current state:', {
                  pathname: window.location.pathname,
                  conversationId,
                  historyLength: window.history.length
                })

                // Navigate to /chat (without replace - adds to history)
                navigate('/chat')

                console.log('[ChatLayout] navigate(/chat) called')
              }}
              className="-ml-1"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <SidebarTrigger className="-ml-1" />
          )}
          <Separator orientation="vertical" className="mr-2 h-4" />

          {/* Chat Info */}
          {activeChat ? (
            <>
              <Avatar className="h-9 w-9">
                <AvatarImage src={activeChat.icon_url} alt={activeChat.title} />
                <AvatarFallback>
                  {activeChat.type === 'group' ? <User className="h-4 w-4" /> : activeChat.title?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold truncate">{activeChat.title}</h1>
                <p className="text-xs text-muted-foreground">
                  {activeChat.type === 'group'
                    ? `${activeChat.member_count || 0} สมาชิก`
                    : chatPartnerUserId && isUserOnline(chatPartnerUserId)
                      ? 'ออนไลน์'
                      : 'ออฟไลน์'}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowConversationDetails(true)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Chat</h1>
            </div>
          )}
        </header>

        {/* Content Area */}
        <Outlet />

        {/* Conversation Details Sheet */}
        <ConversationDetailsSheet
          open={showConversationDetails}
          onOpenChange={setShowConversationDetails}
          conversation={activeChat ?? null}
          currentUserId={currentUserId}
          isUserOnline={isUserOnline}
          onToggleMute={async () => {
            if (!conversationId) return false
            return toggleMuteConversation(conversationId, !activeChat?.is_muted)
          }}
          onTogglePin={async () => {
            if (!conversationId) return false
            return togglePinConversation(conversationId, !activeChat?.is_pinned)
          }}
          onLeaveGroup={async () => {
            console.log("Leave group not implemented yet")
            return false
          }}
          onJumpToMessage={(messageId) => {
            if (jumpToMessage) {
              jumpToMessage(messageId);
              setShowConversationDetails(false);
            }
          }}
        />

        {/* Delete Conversation Confirmation */}
        <AlertDialog open={!!deletingConversation} onOpenChange={() => setDeletingConversation(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="text-destructive" size={20} />
                {conversations.find(c => c.id === deletingConversation)?.type === 'group' ? 'ออกจากกลุ่ม' : 'ลบแชท'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {conversations.find(c => c.id === deletingConversation)?.type === 'group' ? (
                  <>
                    คุณแน่ใจหรือไม่ว่าต้องการออกจากกลุ่ม{' '}
                    <span className="font-semibold">
                      {conversations.find(c => c.id === deletingConversation)?.title}
                    </span>?
                  </>
                ) : (
                  <>
                    คุณแน่ใจหรือไม่ว่าต้องการลบแชทนี้?
                    <span className="block mt-2 text-sm">
                      แชทจะถูกซ่อนจากรายการ (ถ้าได้รับข้อความใหม่จะกลับมาแสดงอีกครั้ง)
                    </span>
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteConversation}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'กำลังดำเนินการ...' :
                  conversations.find(c => c.id === deletingConversation)?.type === 'group' ? 'ออกจากกลุ่ม' : 'ลบแชท'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </SidebarProvider>
  )
}

/**
 * ChatLayout - Outer component with WebSocketProvider and MessageJumpProvider
 */
export default function ChatLayout() {
  return (
    <WebSocketProvider>
      <MessageJumpProvider>
        <ChatLayoutContent />
      </MessageJumpProvider>
    </WebSocketProvider>
  )
}
