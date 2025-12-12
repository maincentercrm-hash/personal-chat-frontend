// src/components/mobile-bottom-nav.tsx
import { useEffect } from "react"
import { MessageSquare, Users, Settings } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useFriendshipStore } from "@/stores/friendshipStore"

interface NavItem {
  path: string
  icon: typeof MessageSquare
  label: string
  badgeKey?: "pendingRequests" // Key to check for badge count
}

const NAV_ITEMS: NavItem[] = [
  {
    path: "/chat",
    icon: MessageSquare,
    label: "แชท",
  },
  {
    path: "/chat/contacts",
    icon: Users,
    label: "รายชื่อ",
    badgeKey: "pendingRequests",
  },
  {
    path: "/chat/settings",
    icon: Settings,
    label: "ตั้งค่า",
  },
]

export function MobileBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  // Get pending requests count from store
  const pendingRequests = useFriendshipStore((state) => state.pendingRequests)
  const fetchPendingRequests = useFriendshipStore((state) => state.fetchPendingRequests)

  // Fetch pending requests on mount
  useEffect(() => {
    fetchPendingRequests()
  }, [fetchPendingRequests])

  const pendingCount = pendingRequests?.length || 0

  const isActive = (path: string) => {
    if (path === "/chat") {
      // For /chat, match exactly or with conversationId
      return location.pathname === "/chat" || location.pathname.startsWith("/chat/") && !location.pathname.startsWith("/chat/contacts") && !location.pathname.startsWith("/chat/settings")
    }
    return location.pathname.startsWith(path)
  }

  const getBadgeCount = (badgeKey?: string) => {
    if (badgeKey === "pendingRequests") {
      return pendingCount
    }
    return 0
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          const badgeCount = getBadgeCount(item.badgeKey)

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", active && "fill-current")} />
                {/* Badge */}
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-white text-[10px] font-bold rounded-full px-1">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
