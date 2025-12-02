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
import ConversationPageDemo from '@/pages/chat/ConversationPageDemo'
import FriendsPage from '@/pages/standard/friend/FriendsPage'
import SettingsPage from '@/pages/standard/setting/SettingsPage'
import { MentionsPage } from '@/pages/standard/mentions/MentionsPage'

// Test Pages
import VideoUploadTest from '@/pages/VideoUploadTest'

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
          {/* Main Routes - Using ChatLayout */}
          <Route element={<ChatLayout />}>
            {/* Additional Pages - MUST come before :conversationId route */}
            <Route path="/chat/contacts" element={<FriendsPage />} />
            <Route path="/chat/settings" element={<SettingsPage />} />
            <Route path="/chat/mentions" element={<MentionsPage />} />

            {/* Chat Routes - conversation list and specific conversation */}
            <Route path="/chat" element={<ConversationPageDemo />} />
            <Route path="/chat/:conversationId" element={<ConversationPageDemo />} />
          </Route>

          {/* Test Pages - Outside ChatLayout */}
          <Route path="/test/video-upload" element={<VideoUploadTest />} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/chat" replace />} />
        </>
      ) : (
        /* Redirect unauthenticated users to login */
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      )}

      {/* ============================================
          FALLBACK (404)
          ============================================ */}
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}