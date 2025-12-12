// AppRoutes.tsx - Clean & Simplified
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// Layouts (เหลือแค่ 2 ตัว)
import AuthLayout from '@/layouts/AuthLayout/AuthLayout'
import ChatLayout from '@/layouts/ChatLayout/ChatLayout'

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Main Pages
import ConversationPageV3 from '@/pages/v2/ConversationPageV3'
import ConversationPageDemo from '@/pages/chat/ConversationPageDemo' // Legacy - kept for fallback
import FriendsPage from '@/pages/standard/friend/FriendsPage'
import SettingsPage from '@/pages/standard/setting/SettingsPage'
import { MentionsPage } from '@/pages/standard/mentions/MentionsPage'

// Test Pages
import VideoUploadTest from '@/pages/VideoUploadTest'
import ChatV2TestPage from '@/pages/test/ChatV2TestPage'

export default function AppRoutes() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  return (
    <Routes>
      {/* ============================================
          AUTH ROUTES (Public)
          ============================================ */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
      </Route>

      {/* ============================================
          MAIN APP ROUTES (Protected)
          ============================================ */}
      {isAuthenticated ? (
        <>
          {/* Main Routes - Using ChatLayout with V3 */}
          <Route element={<ChatLayout />}>
            {/* Additional Pages - MUST come before :conversationId route */}
            <Route path="/chat/contacts" element={<FriendsPage />} />
            <Route path="/chat/settings" element={<SettingsPage />} />
            <Route path="/chat/mentions" element={<MentionsPage />} />

            {/* Main Chat Routes - Now using V3 */}
            <Route path="/chat" element={<ConversationPageV3 />} />
            <Route path="/chat/:conversationId" element={<ConversationPageV3 />} />
          </Route>

          {/* Legacy Routes - Old version (เก็บไว้เผื่อต้องการกลับไปใช้) */}
          <Route element={<ChatLayout />}>
            <Route path="/chat-old" element={<ConversationPageDemo />} />
            <Route path="/chat-old/:conversationId" element={<ConversationPageDemo />} />
          </Route>

          {/* Test Pages */}
          <Route element={<ChatLayout />}>
            <Route path="/test/chat-v2" element={<ChatV2TestPage />} />
            <Route path="/test/chat-v2/:conversationId" element={<ChatV2TestPage />} />
          </Route>

          {/* Test Pages - Outside ChatLayout */}
          <Route path="/test/video-upload" element={<VideoUploadTest />} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/chat" replace />} />

          {/* Fallback for authenticated users - redirect to chat */}
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </>
      ) : (
        /* Redirect unauthenticated users to login */
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      )}
    </Routes>
  )
}