// src/pages/standard/setting/SettingsPage.tsx
import { User, Key, LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProfileForm } from '@/components/user/ProfileForm';
import { PasswordForm } from '@/components/user/PasswordForm';
import { useNavigation } from '@/hooks/useNavigation';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { handleLogout, isLoggingOut } = useNavigation();

  const handleBackToMenu = () => {
    navigate('/dashboard');
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={handleBackToMenu}
            className="p-1 rounded-full hover:bg-muted/50"
          >
            <ArrowLeft size={20} className="text-card-foreground" />
          </button>
          <div>
            <h1 className="text-lg md:text-2xl font-semibold text-card-foreground">การตั้งค่า</h1>
            <p className="text-sm text-muted-foreground">จัดการบัญชีและความเป็นส่วนตัวของคุณ</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Accordion Settings */}
          <div className="bg-card rounded-xl shadow-sm overflow-hidden">
            <Accordion type="single" collapsible defaultValue="profile" className="w-full">
              {/* Profile Section */}
              <AccordionItem value="profile" className="border-b border-border">
                <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={18} className="text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-card-foreground">โปรไฟล์</div>
                      <div className="text-xs text-muted-foreground">แก้ไขข้อมูลส่วนตัว รูปภาพ และชื่อแสดง</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4">
                  <ProfileForm />
                </AccordionContent>
              </AccordionItem>

              {/* Password Section */}
              <AccordionItem value="password" className="border-b-0">
                <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Key size={18} className="text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-card-foreground">รหัสผ่าน</div>
                      <div className="text-xs text-muted-foreground">เปลี่ยนรหัสผ่านเพื่อความปลอดภัย</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4">
                  <PasswordForm />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Logout Button */}
          <div className="bg-card rounded-xl shadow-sm overflow-hidden p-4">
            <Button
              variant="destructive"
              className="w-full flex items-center justify-center gap-2 h-12"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut size={18} />
              <span>{isLoggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
