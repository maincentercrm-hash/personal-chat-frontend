import * as React from "react"
import { MessageSquare, Users, Settings } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { ConversationDTO } from "@/types/conversation.types"
import ConversationItem from "@/components/standard/conversation/ConversationItem"
import CategoryTab from "@/components/standard/conversation/CategoryTab"
import { User } from "lucide-react"
import type { ConversationType } from "@/types/conversation.types"

// Chat navigation
const navItems = [
  {
    title: "แชท",
    url: "/chat",
    icon: MessageSquare,
  },
  {
    title: "รายชื่อ",
    url: "/chat/contacts",
    icon: Users,
  },
  {
    title: "ตั้งค่า",
    url: "/chat/settings",
    icon: Settings,
  },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string
    email: string
    avatar: string
  }
  conversations?: ConversationDTO[]
  activeConversationId?: string
  onSelectConversation?: (id: string) => void
  onTogglePin?: (conversationId: string, isPinned: boolean) => Promise<boolean>
  onToggleMute?: (conversationId: string, isMuted: boolean) => Promise<boolean>
  isUserOnline?: (userId: string) => boolean
  onDelete?: (conversationId: string) => void // เหลือแค่ลบ
}

export function AppSidebar({
  user,
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onTogglePin,
  onToggleMute,
  isUserOnline = () => false,
  onDelete,
  ...props
}: AppSidebarProps) {
  const navigate = useNavigate()
  const { setOpen, isMobile } = useSidebar()
  const [activeNav, setActiveNav] = React.useState(navItems[0])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedTypes, setSelectedTypes] = React.useState<ConversationType[]>([])

  // Debug: Log conversations
  React.useEffect(() => {
   // console.log('📊 [AppSidebar] Conversations:', conversations.length, conversations)
  }, [conversations])

  const defaultUser = {
    name: "Guest",
    email: "guest@example.com",
    avatar: "",
  }

  // Filter conversations
  const filteredConversations = React.useMemo(() => {
    return conversations
      .filter(conv => {
        const matchesSearch = (conv.title || "").toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedTypes.length === 0 || selectedTypes.includes(conv.type as ConversationType)
        return matchesSearch && matchesCategory
      })
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        const aTime = new Date(a.last_message_at || "").getTime()
        const bTime = new Date(b.last_message_at || "").getTime()
        return bTime - aTime
      })
  }, [conversations, searchQuery, selectedTypes])

  const toggleCategory = React.useCallback((type: ConversationType) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type)
      } else {
        return [...prev, type]
      }
    })
  }, [])

  const unreadCount = React.useMemo(() => {
    return conversations.filter(c => c.unread_count > 0).reduce((sum, c) => sum + (c.unread_count || 0), 0)
  }, [conversations])

  // Handle conversation selection and close sidebar on mobile
  const handleSelectConversation = React.useCallback((conversationId: string) => {
    console.log('[AppSidebar] handleSelectConversation called with id:', conversationId)
    onSelectConversation?.(conversationId)

    // Close sidebar on mobile after selection
    if (isMobile) {
      setOpen(false)
    }
  }, [onSelectConversation, isMobile, setOpen])

  return (
    <Sidebar
      collapsible={isMobile ? "offcanvas" : "icon"}
      className="overflow-hidden [&>*[data-sidebar=sidebar]]:flex-row"
      {...props}
    >
      {/* Primary Sidebar (Icon Navigation) */}
      <Sidebar
        collapsible="none"
        className="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="md:h-8 md:p-0"
                onClick={() => {
                  console.log('[AppSidebar] Logo clicked, navigating to /chat')
                  console.log('[AppSidebar] isMobile:', isMobile)

                  navigate('/chat')

                  // Close sidebar on mobile after navigation (with small delay)
                  if (isMobile) {
                    console.log('[AppSidebar] Closing sidebar in 100ms...')
                    setTimeout(() => {
                      setOpen(false)
                      console.log('[AppSidebar] Sidebar closed')
                    }, 100)
                  }
                }}
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <MessageSquare className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">BREEZ CHAT</span>
                  <span className="truncate text-xs">Messaging</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeNav.title === item.title

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={{
                          children: item.title,
                          hidden: false,
                        }}
                        onClick={() => {
                          console.log('[AppSidebar] Menu clicked:', item.title)
                          console.log('[AppSidebar] isMobile:', isMobile)

                          setActiveNav(item)

                          // Navigate to the page first
                          if (item.url) {
                            navigate(item.url)
                          }

                          // Close sidebar on mobile after navigation (with small delay)
                          if (isMobile) {
                            console.log('[AppSidebar] Closing sidebar in 100ms...')
                            setTimeout(() => {
                              setOpen(false)
                              console.log('[AppSidebar] Sidebar closed')
                            }, 100)
                          } else {
                            console.log('[AppSidebar] Desktop - keeping sidebar open')
                          }
                        }}
                        isActive={isActive}
                        className="px-2.5 md:px-2"
                      >
                        <Icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={user || defaultUser} />
        </SidebarFooter>
      </Sidebar>

      {/* Secondary Sidebar (Conversation List) - ซ่อนใน mobile */}
      <Sidebar collapsible="none" className="hidden md:flex flex-1">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeNav.title}
            </div>
            {unreadCount > 0 && (
              <div className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                {unreadCount}
              </div>
            )}
          </div>
          <SidebarInput
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={activeConversationId === conversation.id}
                    onSelect={() => handleSelectConversation(conversation.id)}
                    onTogglePin={onTogglePin}
                    onToggleMute={onToggleMute}
                    isUserOnline={isUserOnline}
                    onDelete={onDelete}
                  />
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {searchQuery ? "No conversations found" : "No conversations"}
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
