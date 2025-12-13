// src/components/standard/friends/GroupItem.tsx
import React from 'react';
import { Users, MoreVertical, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ConversationDTO } from '@/types/conversation.types';

interface GroupItemProps {
  group: ConversationDTO;
  onLeaveGroup?: (id: string) => Promise<boolean>;
}

const GroupItem: React.FC<GroupItemProps> = ({ group, onLeaveGroup }) => {
  const [showOptions, setShowOptions] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const navigate = useNavigate();
  
  const handleOpenChat = () => {
    navigate(`/chat/${group.id}`);
  };
  
  const handleLeaveGroup = async () => {
    if (!onLeaveGroup) return;
    
    if (window.confirm(`คุณต้องการออกจากกลุ่ม "${group.title}" ใช่หรือไม่?`)) {
      setIsLoading(true);
      try {
        await onLeaveGroup(group.id);
      } catch (error) {
        console.error('Failed to leave group:', error);
      } finally {
        setIsLoading(false);
        setShowOptions(false);
      }
    }
  };
  
  return (
    <div className="p-4 border-b border-border flex items-center justify-between">
      <div 
        className="flex items-center gap-3 flex-grow cursor-pointer"
        onClick={handleOpenChat}
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          {group.icon_url ? (
            <img 
              src={group.icon_url} 
              alt={group.title} 
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <Users size={20} className="text-muted-foreground" />
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-card-foreground">{group.title}</h3>
          <p className="text-xs text-muted-foreground">{group.member_count || 0} สมาชิก</p>
          {group.last_message_text && (
            <p className="text-xs text-muted-foreground/70 truncate max-w-[200px]">
              {group.last_message_text}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center">
        <button 
          onClick={handleOpenChat}
          className="p-2 rounded-full hover:bg-muted/50 mr-1"
        >
          <MessageCircle size={18} className="text-primary" />
        </button>
        
        {onLeaveGroup && (
          <div className="relative">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 rounded-full hover:bg-muted/50"
            >
              <MoreVertical size={18} className="text-muted-foreground" />
            </button>
            
            {showOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg z-10 py-1 border border-border">
                <button
                  onClick={handleLeaveGroup}
                  disabled={isLoading}
                  className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-muted/50 flex items-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-t-transparent border-destructive rounded-full animate-spin"></div>
                  ) : (
                    <Users size={16} />
                  )}
                  <span>ออกจากกลุ่ม</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupItem;