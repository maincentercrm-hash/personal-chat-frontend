// src/components/standard/friends/AddFriendModal.tsx
import React, { useState } from 'react';
import { X, Search, UserPlus, Building } from 'lucide-react';
import useSearchWithPrefix, { type CombinedSearchResult } from '@/hooks/useSearchWithPrefix';

interface AddFriendModalProps {
  onClose: () => void;
  onAddFriend: (friendId: string) => Promise<boolean>;
  onFollowBusiness?: (businessId: string) => Promise<boolean>;
  onStartBusinessConversation?: (businessId: string) => Promise<string | null>;
}

/**
 * Modal สำหรับค้นหาและเพิ่มเพื่อนหรือติดตามธุรกิจ
 * ใช้ prefix @ นำหน้าเพื่อค้นหาธุรกิจ
 * ปรับปรุงให้ใช้ปุ่มค้นหาแทนการค้นหาอัตโนมัติ
 */
const AddFriendModal: React.FC<AddFriendModalProps> = ({ 
  onClose, 
  onAddFriend,
  onFollowBusiness,
  onStartBusinessConversation
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // ใช้ custom hook สำหรับการค้นหาด้วย prefix
  const {
    loading,
    error,
    success,
    results,
    search,
    updateFriendshipStatus,
    updateFollowStatus,
    setError,
    setSuccessMessage
  } = useSearchWithPrefix();
  
  // ฟังก์ชันสำหรับการค้นหาเมื่อกดปุ่มค้นหา
  const handleSearch = async () => {
    if (searchTerm.trim().length < 2) {
      setError('กรุณาระบุคำค้นหาอย่างน้อย 2 ตัวอักษร');
      return;
    }
    
    await search(searchTerm, true); // เพิ่มพารามิเตอร์ exactMatch = true เพื่อให้ค้นหาตรงกับทั้งหมด
  };

  // ฟังก์ชันสำหรับการค้นหาเมื่อกด Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  // ส่งคำขอเป็นเพื่อน
  const handleSendRequest = async (userId: string) => {
    // ✅ ป้องกันการกดซ้ำ
    if (loading) return;

    try {
      const result = await onAddFriend(userId);
      if (result) {
        setSuccessMessage('ส่งคำขอเป็นเพื่อนเรียบร้อยแล้ว');
        updateFriendshipStatus(userId, 'pending');
      } else {
        setError('ไม่สามารถส่งคำขอเป็นเพื่อนได้');
      }
    } catch (err) {
      console.error('Error sending friend request:', err);
      setError('เกิดข้อผิดพลาดในการส่งคำขอเป็นเพื่อน');
    }
  };
  
  // ติดตามธุรกิจ
  const handleFollowBusiness = async (businessId: string) => {
    if (!onFollowBusiness) return;
    
    try {
      const result = await onFollowBusiness(businessId);
      if (result) {
        setSuccessMessage('ติดตามบัญชีธุรกิจเรียบร้อยแล้ว');
        updateFollowStatus(businessId, true);
      } else {
        setError('ไม่สามารถติดตามบัญชีธุรกิจได้');
      }
    } catch (err) {
      console.error('Error following business:', err);
      setError('เกิดข้อผิดพลาดในการติดตามบัญชีธุรกิจ');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-medium text-card-foreground">
            {searchTerm.startsWith('@') ? 'ค้นหาบัญชีธุรกิจ' : 'เพิ่มเพื่อน'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-card-foreground mb-1">
              ค้นหา
            </label>
            <div className="mb-1  text-muted-foreground">
              พิมพ์ชื่อเพื่อค้นหาผู้ใช้ หรือพิมพ์ @ นำหน้าเพื่อค้นหาธุรกิจ (เช่น @starbucks)
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-3 flex items-center">
                  <Search size={18} className="text-muted-foreground" />
                </div>
                <input
                  id="username"
                  type="text"
                  placeholder="ค้นหาผู้ใช้หรือ @ธุรกิจ"
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                ) : (
                  'ค้นหา'
                )}
              </button>
            </div>
     
            {success && <p className="mt-2  text-primary">{success}</p>}
          </div>
          
          {/* แสดงผลการค้นหา */}
          <div className="max-h-60 overflow-y-auto mt-2">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : results.length > 0 ? (
              <ul className="divide-y divide-border">
                {results.map((result) => (
                  <SearchResultItem 
                    key={`${result.type}-${result.id}`}
                    result={result}
                    onSendRequest={handleSendRequest}
                    onFollowBusiness={handleFollowBusiness}
                    onStartBusinessConversation={onStartBusinessConversation}
                    loading={loading}
                    hasFollowPermission={!!onFollowBusiness}
                    hasStartChatPermission={!!onStartBusinessConversation}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                {error ? error : searchTerm.length > 1 
                  ? 'ไม่พบผลลัพธ์ที่ตรงกับการค้นหา' 
                  : 'กรุณากรอกคำค้นหาและกดปุ่มค้นหา'}
              </p>
            )}
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component ย่อยสำหรับแสดงรายการผลลัพธ์แต่ละรายการ
interface SearchResultItemProps {
  result: CombinedSearchResult;
  onSendRequest: (userId: string) => Promise<void>;
  onFollowBusiness: (businessId: string) => Promise<void>;
  onStartBusinessConversation?: (businessId: string) => Promise<string | null>;
  loading: boolean;
  hasFollowPermission: boolean;
  hasStartChatPermission: boolean;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ 
  result, 
  onSendRequest, 
  onFollowBusiness,
  onStartBusinessConversation,
  loading,
  hasFollowPermission,
  hasStartChatPermission
}) => {
  const [isStartingChat, setIsStartingChat] = useState(false);

  // ฟังก์ชันสำหรับเริ่มการสนทนากับบัญชีธุรกิจ
  const handleStartChat = async () => {
    if (!onStartBusinessConversation || !result.id) return;
    
    try {
      setIsStartingChat(true);
      await onStartBusinessConversation(result.id);
      // การนำทางจะถูกจัดการโดย hook ไม่ใช่ component
    } catch (err) {
      console.error('Error starting business conversation:', err);
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <li className="py-2 flex items-center justify-between">
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-3">
          {result.profile_image_url ? (
            <img 
              src={result.profile_image_url} 
              alt={result.display_name} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : result.type === 'business' ? (
            <Building size={16} className="text-muted-foreground" />
          ) : (
            <UserPlus size={16} className="text-muted-foreground" />
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium text-card-foreground flex items-center">
            {result.display_name}
            {result.type === 'business' && (
              <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary  rounded-sm">
                ธุรกิจ
              </span>
            )}
          </h4>
          <p className=" text-muted-foreground">{result.username}</p>
          {result.type === 'business' && result.description && (
            <p className=" text-muted-foreground truncate max-w-[200px]">
              {result.description}
            </p>
          )}
        </div>
      </div>
      
      {/* แสดงปุ่มตามประเภทของผลลัพธ์ */}
      <div className="flex gap-2">
        {/* ถ้าเป็นบัญชีธุรกิจ แสดงปุ่มเริ่มแชทด้วย */}
        {result.type === 'business' && hasStartChatPermission && (
          <button
            onClick={handleStartChat}
            disabled={loading || isStartingChat}
            className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white"
            title="เริ่มแชท"
          >
            {isStartingChat ? (
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mx-auto"></div>
            ) : (
              'แชท'
            )}
          </button>
        )}
        
        {/* ปุ่มเพิ่มเพื่อน หรือ ติดตามธุรกิจ */}
        {result.type === 'user' ? (
          <button
            onClick={() => onSendRequest(result.id)}
            disabled={result.friendship_status !== 'none' || loading}
            className={` px-3 py-1 rounded ${
              result.friendship_status === 'none'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {result.friendship_status === 'none' 
              ? 'เพิ่มเพื่อน' 
              : result.friendship_status === 'pending' 
                ? 'รอการตอบรับ' 
                : result.friendship_status === 'accepted'
                  ? 'เป็นเพื่อนแล้ว'
                  : 'ไม่สามารถเพิ่มได้'}
          </button>
        ) : (
          <button
            onClick={() => onFollowBusiness(result.id)}
            disabled={result.is_followed || loading || !hasFollowPermission}
            className={` px-3 py-1 rounded ${
              !result.is_followed && hasFollowPermission
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {result.is_followed ? 'ติดตามแล้ว' : 'ติดตาม'}
          </button>
        )}
      </div>
    </li>
  );
};

export default AddFriendModal;