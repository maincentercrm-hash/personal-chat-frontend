// src/features/common/hooks/useNavigation.ts
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export const useNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const isActiveMenu = (path: string): boolean => {
    if (path === '/chat' && location.pathname === '/chat') {
      return true;
    }
    
    return location.pathname.startsWith(path) && path !== '/chat';
  };
  
  const isInChatPage = location.pathname.includes('/chat/');
  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // เรียกใช้ logout จาก useAuth
      await logout();
      // redirect หลังจาก logout
      navigate('/auth/login');
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  return {
    navigate,
    isActiveMenu,
    isInChatPage,
    handleLogout,
    isLoggingOut
  };
};