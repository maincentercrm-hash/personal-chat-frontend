// src/components/standard/friends/CreateGroupModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Search } from 'lucide-react';
import useFriendship from '@/hooks/useFriendship';
import type { FriendItem } from '@/types/user-friendship.types';
import { useNavigate } from 'react-router-dom';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreateGroup: (title: string, memberIds: string[], iconUrl?: string) => Promise<string | null>;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onCreateGroup }) => {
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<FriendItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const { friends, getFriends } = useFriendship();
  
  useEffect(() => {
    getFriends();
  }, [getFriends]);
  
  // กรองเพื่อนตามคำค้นหา
  const filteredFriends = friends?.filter(friend => 
    !selectedFriends.some(selected => selected.id === friend.id) && 
    ((friend.display_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
     (friend.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
  ) || [];
  
  const handleSelectFriend = (friend: FriendItem) => {
    setSelectedFriends([...selectedFriends, friend]);
  };
  
  const handleRemoveFriend = (friendId: string) => {
    setSelectedFriends(selectedFriends.filter(friend => friend.id !== friendId));
  };
  
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('กรุณาระบุชื่อกลุ่ม');
      return;
    }
    
    if (selectedFriends.length === 0) {
      setError('กรุณาเลือกสมาชิกอย่างน้อย 1 คน');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const memberIds = selectedFriends.map(friend => friend.id);
      const conversationId = await onCreateGroup(groupName, memberIds);
      
      if (conversationId) {
        navigate(`/chat/${conversationId}`);
      } else {
        setError('ไม่สามารถสร้างกลุ่มได้ โปรดลองอีกครั้ง');
      }
    } catch (err) {
      console.error('Error creating group:', err);
      setError('เกิดข้อผิดพลาดในการสร้างกลุ่ม');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-medium text-card-foreground">สร้างกลุ่มใหม่</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <label htmlFor="groupName" className="block text-sm font-medium text-card-foreground mb-1">
              ชื่อกลุ่ม
            </label>
            <input
              id="groupName"
              type="text"
              placeholder="ชื่อกลุ่ม"
              className="w-full px-4 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={loading}
            />
          </div>
          
          {/* แสดงสมาชิกที่เลือกแล้ว */}
          {selectedFriends.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-card-foreground mb-2">
                สมาชิกที่เลือก ({selectedFriends.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedFriends.map(friend => (
                  <div 
                    key={friend.id} 
                    className="flex items-center bg-muted rounded-full px-3 py-1 text-sm text-foreground"
                  >
                    <span className="mr-2">{friend.display_name}</span>
                    <button 
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-card-foreground mb-1">
              เพิ่มสมาชิก
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center">
                <Search size={18} className="text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาเพื่อน"
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          
          {/* แสดงรายชื่อเพื่อนที่สามารถเลือกได้ */}
          <div className="max-h-60 overflow-y-auto">
            {filteredFriends.length > 0 ? (
              <ul className="divide-y divide-border">
                {filteredFriends.map((friend) => (
                  <li 
                    key={friend.id} 
                    className="py-2 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSelectFriend(friend)}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3">
                        {friend.profile_image_url ? (
                          <img 
                            src={friend.profile_image_url} 
                            alt={friend.display_name} 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <UserPlus size={16} className="text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-card-foreground">{friend.display_name}</h4>
                        <p className=" text-muted-foreground">{friend.username}</p>
                      </div>
                    </div>
                    <button className="text-primary">
                      <UserPlus size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                {searchTerm.length > 0 
                  ? 'ไม่พบเพื่อนที่ตรงกับการค้นหา' 
                  : 'ไม่มีเพื่อนที่สามารถเพิ่มได้'}
              </p>
            )}
          </div>
          
          {error && <p className="mt-2  text-destructive">{error}</p>}
          
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleCreateGroup}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                <Users size={16} />
              )}
              สร้างกลุ่ม
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;