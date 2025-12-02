# Dialog Component Extraction - ConversationDetailsSheet

**วันที่:** 2025-11-28
**เป้าหมาย:** แยก Dialog components ออกจาก ConversationDetailsSheet.tsx เพื่อลดความยาวของโค้ดและเพิ่มความสามารถในการนำกลับมาใช้ใหม่

---

## 🎯 ปัญหาเดิม

**ConversationDetailsSheet.tsx มีโค้ดยาวเกินไป:**
- มี 2 dialogs ฝังอยู่ภายใน component (Edit Group, Leave Group)
- โค้ดยาวกว่า 600 บรรทัด ทำให้ดูแลรักษายาก
- State และ handlers สำหรับ dialogs ทำให้ component ซับซ้อน
- ไม่สามารถนำ dialogs กลับมาใช้ในที่อื่นได้

---

## ✅ การแก้ไข

### 1. สร้าง EditGroupDialog Component

**ไฟล์ใหม่:** `src/components/standard/conversation/EditGroupDialog.tsx`

**ฟีเจอร์:**
- แก้ไขชื่อกลุ่ม (title)
- อัปโหลดและเปลี่ยนไอคอนกลุ่ม (icon_url)
- Validation (file type, size, required fields)
- File upload ไป R2/Cloudinary
- Loading states (uploading, updating)
- Error handling และ toast notifications
- Reset form เมื่อเปิด dialog

**Props Interface:**
```typescript
interface EditGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationDTO;
  onUpdate: (updates: { title?: string; icon_url?: string }) => Promise<boolean>;
}
```

**การใช้งาน:**
```typescript
<EditGroupDialog
  open={editDialogOpen}
  onOpenChange={setEditDialogOpen}
  conversation={conversation}
  onUpdate={handleUpdateConversation}
/>
```

---

### 2. สร้าง LeaveGroupDialog Component

**ไฟล์ใหม่:** `src/components/standard/conversation/LeaveGroupDialog.tsx`

**ฟีเจอร์:**
- แสดง confirmation dialog ก่อนออกจากกลุ่ม
- แสดงคำเตือนพิเศษถ้าเป็น creator
- Loading state ขณะดำเนินการ
- Error handling และ toast notifications
- ปิด dialog อัตโนมัติเมื่อออกจากกลุ่มสำเร็จ

**Props Interface:**
```typescript
interface LeaveGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationDTO;
  isCreator: boolean;
  onLeave: () => Promise<boolean>;
}
```

**การใช้งาน:**
```typescript
<LeaveGroupDialog
  open={leaveDialogOpen}
  onOpenChange={setLeaveDialogOpen}
  conversation={conversation}
  isCreator={isCreator}
  onLeave={handleLeaveGroup}
/>
```

---

### 3. สร้าง ConversationInfoTab Component

**ไฟล์ใหม่:** `src/components/standard/conversation/ConversationInfoTab.tsx`

**ฟีเจอร์:**
- แสดงข้อความ "กำลังพัฒนา" สำหรับกลุ่ม
- แสดงข้อความ "ข้อมูลแชทส่วนตัว" สำหรับแชทส่วนตัว
- เตรียมไว้สำหรับฟีเจอร์ Note ในอนาคต

**Props Interface:**
```typescript
interface ConversationInfoTabProps {
  conversation: ConversationDTO;
  isGroup: boolean;
}
```

**การใช้งาน:**
```typescript
<ConversationInfoTab conversation={conversation} isGroup={isGroup} />
```

---

## 📁 ไฟล์ที่แก้ไข

### 1. EditGroupDialog.tsx (ไฟล์ใหม่)

**ขนาด:** ~235 บรรทัด

**หน้าที่:**
- จัดการ state: `editTitle`, `editIconUrl`, `uploading`, `updating`, `fileInputRef`
- จัดการ file upload
- Validation และ error handling
- เรียก API update conversation

---

### 2. LeaveGroupDialog.tsx (ไฟล์ใหม่)

**ขนาด:** ~77 บรรทัด

**หน้าที่:**
- จัดการ state: `loading`
- แสดง confirmation message
- เรียก callback `onLeave`
- แสดง toast และปิด dialog

---

### 3. ConversationInfoTab.tsx (ไฟล์ใหม่)

**ขนาด:** ~25 บรรทัด

**หน้าที่:**
- แสดงข้อความ "กำลังพัฒนา" สำหรับกลุ่ม
- แสดงข้อความ "ข้อมูลแชทส่วนตัว" สำหรับแชทส่วนตัว
- Placeholder สำหรับฟีเจอร์ Note ในอนาคต

---

### 4. ConversationDetailsSheet.tsx (ปรับปรุง)

**ขนาดเดิม:** ~620 บรรทัด
**ขนาดใหม่:** 331 บรรทัด
**ลดลง:** ~289 บรรทัด (-47%)

**การเปลี่ยนแปลง:**

#### ลบ Imports ที่ไม่ใช้แล้ว:
```typescript
// ลบออก
import { useRef, type ChangeEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, ... } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, ... } from "@/components/ui/alert-dialog";
import { AlertCircle, Image as ImageIcon } from 'lucide-react';
import type { UploadImageResponse } from '@/types/upload.types';
import apiService from '@/services/apiService';
import { FILE_API } from '@/constants/api/standardApiConstants';
import { MembersList } from './MembersList';
```

#### เพิ่ม Imports ใหม่:
```typescript
import { EditGroupDialog } from './EditGroupDialog';
import { LeaveGroupDialog } from './LeaveGroupDialog';
import { ConversationInfoTab } from './ConversationInfoTab';
```

#### ลด State Variables:
```typescript
// Before (8 states + 1 ref)
const [leavingGroup, setLeavingGroup] = useState(false);
const [loading, setLoading] = useState(false);
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [editTitle, setEditTitle] = useState('');
const [editIconUrl, setEditIconUrl] = useState('');
const [updating, setUpdating] = useState(false);
const [uploading, setUploading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);

// After (2 states only)
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
```

#### ลบ Complex Handlers:
```typescript
// ลบออก (ย้ายไป EditGroupDialog)
- handleOpenEditDialog()
- handleIconClick()
- handleFileUpload()
- handleSaveGroupChanges()

// ลบออก (ย้ายไป LeaveGroupDialog)
- handleLeaveGroup() (เดิม)
```

#### เพิ่ม Simple Wrapper Functions:
```typescript
// ใช้แทน handlers ที่ซับซ้อน
const handleLeaveGroup = async (): Promise<boolean> => {
  if (!onLeaveGroup) return false;
  const success = await onLeaveGroup();
  if (success) {
    onOpenChange(false); // ปิด Sheet
  }
  return success;
};

const handleUpdateConversation = async (
  updates: { title?: string; icon_url?: string }
): Promise<boolean> => {
  return await updateConversation(conversation.id, updates);
};
```

#### แทนที่ Embedded Content ด้วย Components:
```typescript
// Before: ~120 บรรทัดของ embedded content

// After: เรียกใช้ components

// Info Tab - แยกออกมาเป็น component
<TabsContent value="info" className="flex-1 overflow-y-auto">
  <ConversationInfoTab conversation={conversation} isGroup={isGroup} />
</TabsContent>

// Edit Group Dialog
<EditGroupDialog
  open={editDialogOpen}
  onOpenChange={setEditDialogOpen}
  conversation={conversation}
  onUpdate={handleUpdateConversation}
/>

// Leave Group Dialog
<LeaveGroupDialog
  open={leaveDialogOpen}
  onOpenChange={setLeaveDialogOpen}
  conversation={conversation}
  isCreator={isCreator}
  onLeave={handleLeaveGroup}
/>
```

---

## 🎨 ข้อดีของการแยก Components

### 1. ลดความซับซ้อน
- ConversationDetailsSheet.tsx สั้นลง 40%
- ลด cognitive load ในการอ่านโค้ด
- แต่ละ component มีหน้าที่ชัดเจน

### 2. Reusability
- สามารถนำ EditGroupDialog ไปใช้ในหน้าอื่นได้
- สามารถนำ LeaveGroupDialog ไปใช้ในที่อื่นได้
- ไม่ต้องเขียนโค้ดซ้ำ

### 3. Maintainability
- แก้ไข dialog logic ที่เดียว
- ง่ายต่อการ debug
- ง่ายต่อการเขียน unit tests

### 4. Separation of Concerns
- Dialog components จัดการ UI และ validation เอง
- Parent component เพียงจัดการ state และ callbacks
- ชัดเจนว่าใครทำอะไร

---

## 📊 Before vs After

### Before
```
ConversationDetailsSheet.tsx (620 บรรทัด)
├── Imports (48 บรรทัด)
├── State Management (9 variables)
├── Handlers (5 complex functions)
├── Component JSX (300 บรรทัด)
├── Edit Dialog (90 บรรทัด - embedded)
└── Leave Dialog (30 บรรทัด - embedded)
```

### After
```
ConversationDetailsSheet.tsx (331 บรรทัด)
├── Imports (32 บรรทัด)
├── State Management (2 variables)
├── Handlers (2 simple wrappers)
├── Component JSX (280 บรรทัด)
├── <ConversationInfoTab /> (1 component call)
├── <EditGroupDialog /> (1 component call)
└── <LeaveGroupDialog /> (1 component call)

ConversationInfoTab.tsx (25 บรรทัด)
└── Info tab placeholder

EditGroupDialog.tsx (235 บรรทัด)
└── Edit dialog logic + UI

LeaveGroupDialog.tsx (77 บรรทัด)
└── Leave dialog logic + UI
```

---

## ✅ Features Checklist

### ConversationInfoTab
- [x] แสดง "กำลังพัฒนา" สำหรับกลุ่ม
- [x] แสดง "ข้อมูลแชทส่วนตัว" สำหรับแชทส่วนตัว
- [x] เตรียมพื้นที่สำหรับฟีเจอร์ Note

### EditGroupDialog
- [x] File upload ไอคอนกลุ่ม
- [x] Validation file type และ size
- [x] แก้ไขชื่อกลุ่ม
- [x] แก้ไข icon URL (advanced users)
- [x] Loading states (uploading, updating)
- [x] Error handling
- [x] Toast notifications
- [x] Reset form เมื่อเปิด dialog
- [x] ตรวจสอบการเปลี่ยนแปลงก่อน save

### LeaveGroupDialog
- [x] Confirmation message
- [x] คำเตือนพิเศษสำหรับ creator
- [x] Loading state
- [x] Error handling
- [x] Toast notifications
- [x] ปิด dialog และ sheet เมื่อสำเร็จ

### ConversationDetailsSheet
- [x] ลดขนาดโค้ด 47%
- [x] State management ง่ายขึ้น
- [x] Imports น้อยลง
- [x] Handlers เรียบง่าย
- [x] ใช้ extracted components (Info Tab, Dialogs)

---

## 🚀 ผลลัพธ์

**TypeScript Errors:** 0

**Code Quality:**
- ✅ ลดความซับซ้อนของ ConversationDetailsSheet
- ✅ แยก concerns ชัดเจน
- ✅ เพิ่ม reusability
- ✅ ง่ายต่อการดูแลรักษา

**User Experience:**
- ✅ ฟังก์ชันการทำงานเหมือนเดิมทุกประการ
- ✅ ไม่มีการเปลี่ยนแปลง UI
- ✅ Performance ดีขึ้น (components แยกกัน)

---

## 🔄 Tab "ข้อมูล" Status

**Tab "ข้อมูล" ปัจจุบัน:**
- แสดงข้อความ "กำลังพัฒนา" สำหรับกลุ่ม
- แสดงข้อความ "ข้อมูลแชทส่วนตัว" สำหรับแชทส่วนตัว
- แยกออกมาเป็น ConversationInfoTab component

**อนาคต:**
- เตรียมไว้สำหรับ Note feature
- จะเพิ่มฟีเจอร์จดบันทึกในกลุ่ม
- สามารถเพิ่มฟีเจอร์อื่นๆ ได้ง่ายใน component เดียว

---

**สถานะ:** ✅ เสร็จสมบูรณ์
**Last Updated:** 2025-11-28
