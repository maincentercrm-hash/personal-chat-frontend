// src/components/chat/MobileConversationList.tsx
/**
 * Mobile Conversation List - แสดง conversation list ใน mobile
 * ใช้แทน EmptyConversationView เมื่ออยู่ที่ /chat บน mobile
 */

import { useState, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Users, User } from "lucide-react"
import useConversationStore from "@/stores/conversationStore"
import { useOnlineStatus } from "@/hooks/useOnlineStatus"
import ConversationItem from "@/components/standard/conversation/ConversationItem"
import CategoryTab from "@/components/standard/conversation/CategoryTab"
import { SearchBar } from "@/components/search/SearchBar"
import type { ConversationType } from "@/types/conversation.types"

export function MobileConversationList() {
  const navigate = useNavigate()
  const [selectedTypes, setSelectedTypes] = useState<ConversationType[]>([])

  // Get conversations from store
  const conversations = useConversationStore((state) => state.conversations)
  const togglePinConversation = useConversationStore((state) => state.togglePinConversation)
  const toggleMuteConversation = useConversationStore((state) => state.toggleMuteConversation)
  const deleteConversation = useConversationStore((state) => state.deleteConversation)

  // Get all direct chat user IDs for online status
  const allDirectChatUserIds = useMemo(() => {
    return conversations
      .filter((conv) => conv.type === "direct" && conv.contact_info?.user_id)
      .map((conv) => conv.contact_info!.user_id)
  }, [conversations])

  const { isUserOnline } = useOnlineStatus(allDirectChatUserIds)

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    return conversations
      .filter((conv) => {
        const matchesCategory =
          selectedTypes.length === 0 || selectedTypes.includes(conv.type as ConversationType)
        return matchesCategory
      })
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        const aTime = new Date(a.last_message_at || "").getTime()
        const bTime = new Date(b.last_message_at || "").getTime()
        return bTime - aTime
      })
  }, [conversations, selectedTypes])

  const toggleCategory = useCallback((type: ConversationType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type)
      } else {
        return [...prev, type]
      }
    })
  }, [])

  const unreadCount = useMemo(() => {
    return conversations
      .filter((c) => c.unread_count > 0)
      .reduce((sum, c) => sum + (c.unread_count || 0), 0)
  }, [conversations])

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      navigate(`/chat/${conversationId}`)
    },
    [navigate]
  )

  const handleDelete = useCallback(
    (conversationId: string) => {
      // Simple delete without confirmation for now
      deleteConversation(conversationId, "")
    },
    [deleteConversation]
  )

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">แชท</h1>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              {unreadCount}
            </span>
          )}
        </div>

        {/* Search */}
        <SearchBar />

        {/* Category Tabs */}
        <div className="flex gap-2">
          <CategoryTab
            icon={User}
            label="ส่วนตัว"
            isSelected={selectedTypes.includes("direct")}
            onClick={() => toggleCategory("direct")}
          />
          <CategoryTab
            icon={Users}
            label="กลุ่ม"
            isSelected={selectedTypes.includes("group")}
            onClick={() => toggleCategory("group")}
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={false}
              onSelect={() => handleSelectConversation(conversation.id)}
              onTogglePin={togglePinConversation}
              onToggleMute={toggleMuteConversation}
              isUserOnline={isUserOnline}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">
            ไม่มีการสนทนา
          </div>
        )}
      </div>
    </div>
  )
}

export default MobileConversationList
