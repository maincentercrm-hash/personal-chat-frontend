// src/components/group/MemberItem.tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Crown, Shield, User, UserMinus } from 'lucide-react';
import type { ConversationMemberWithRole } from '@/types/group.types';
import { hasPermission, ROLE_CONFIG } from '@/constants/group.constants';

interface MemberItemProps {
  member: ConversationMemberWithRole;
  isCurrentUser: boolean;
  currentUserRole: 'owner' | 'admin' | 'member';
  onPromote: (userId: string) => void;
  onDemote: (userId: string) => void;
  onTransferOwnership: (userId: string) => void;
  onRemove: (userId: string) => void;
}

export function MemberItem({
  member,
  isCurrentUser,
  currentUserRole,
  onPromote,
  onDemote,
  onTransferOwnership,
  onRemove,
}: MemberItemProps) {
  const canManage = !isCurrentUser && member.role !== 'owner';
  const config = ROLE_CONFIG[member.role];

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50">
      <Avatar className="h-10 w-10">
        <AvatarImage src={member.user.profile_image_url} />
        <AvatarFallback>
          {member.user.display_name?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {member.user.display_name}
          {isCurrentUser && (
            <span className="text-muted-foreground text-sm ml-2">(คุณ)</span>
          )}
        </p>
        <Badge variant={config.variant} className="mt-1 text-xs">
          {member.role === 'owner' && <Crown className="w-3 h-3 mr-1" />}
          {member.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
          {member.role === 'member' && <User className="w-3 h-3 mr-1" />}
          {config.label}
        </Badge>
      </div>

      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-accent rounded-md">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Promote to Admin */}
            {hasPermission(currentUserRole, 'canPromoteToAdmin') &&
              member.role === 'member' && (
                <DropdownMenuItem onClick={() => onPromote(member.user_id)}>
                  <Shield className="w-4 h-4 mr-2" />
                  เลื่อนเป็นผู้ดูแล
                </DropdownMenuItem>
              )}

            {/* Demote to Member */}
            {hasPermission(currentUserRole, 'canDemoteAdmin') &&
              member.role === 'admin' && (
                <DropdownMenuItem onClick={() => onDemote(member.user_id)}>
                  <User className="w-4 h-4 mr-2" />
                  ลดเป็นสมาชิก
                </DropdownMenuItem>
              )}

            {/* Transfer Ownership */}
            {hasPermission(currentUserRole, 'canTransferOwnership') && (
              <>
                {(member.role === 'admin' || member.role === 'member') && (
                  <DropdownMenuSeparator />
                )}
                <DropdownMenuItem
                  onClick={() => onTransferOwnership(member.user_id)}
                  className="text-yellow-600"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  โอนความเป็นเจ้าของ
                </DropdownMenuItem>
              </>
            )}

            {/* Remove Member */}
            {hasPermission(currentUserRole, 'canRemoveMember') &&
              (member.role === 'member' ||
                (member.role === 'admin' &&
                  hasPermission(currentUserRole, 'canRemoveAdmin'))) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onRemove(member.user_id)}
                    className="text-destructive"
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    ลบออกจากกลุ่ม
                  </DropdownMenuItem>
                </>
              )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
