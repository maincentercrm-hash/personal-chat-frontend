# ✅ แก้ไขโครงสร้าง API Constants - COMPLETE

**วันที่:** 2025-11-28
**ปัญหา:** URL ซ้ำซ้อน `/api/v1/api/v1/...`
**สาเหตุ:** ไม่ได้ทำตามโครงสร้างที่มีอยู่ (hardcode URL แทนที่จะใช้ constants)

---

## 🐛 ปัญหาที่พบ

**URL ผิด:**
```
https://b01.ngrok.dev/api/v1/api/v1/conversations/.../activities
                        ^^^^^^^^^ ซ้ำซ้อน!
```

**สาเหตุ:**
- ใช้ hardcode `/api/v1/conversations/...` ใน `groupService.ts`
- แต่ `apiService` มี baseURL ที่มี `/api/v1` อยู่แล้ว
- ผลลัพธ์: baseURL + hardcode path = `/api/v1` + `/api/v1/...` ซ้ำ!

---

## ✅ วิธีแก้ไข

### 1. เพิ่ม GROUP_API Constants

**ไฟล์:** `src/constants/api/standardApiConstants.ts`

```typescript
/**
 * API สำหรับจัดการกลุ่ม (Group Management)
 */
export const GROUP_API = {
  // การจัดการสิทธิ์สมาชิก
  UPDATE_MEMBER_ROLE: (conversationId: string, userId: string) =>
    `${API_BASE_URL}/conversations/${conversationId}/members/${userId}/role`,

  // การโอนความเป็นเจ้าของ
  TRANSFER_OWNERSHIP: (conversationId: string) =>
    `${API_BASE_URL}/conversations/${conversationId}/transfer-ownership`,

  // ประวัติกิจกรรม
  GET_ACTIVITIES: (conversationId: string) =>
    `${API_BASE_URL}/conversations/${conversationId}/activities`,
};
```

**หมายเหตุ:**
- ✅ ใช้ `${API_BASE_URL}/...` (มี `/api/v1` อยู่แล้ว)
- ❌ ไม่ใช้ `/api/v1/...` (ซ้ำซ้อน)

---

### 2. แก้ไข groupService.ts

**ไฟล์:** `src/services/groupService.ts`

**Before (ผิด):**
```typescript
await apiService.patch(
  `/api/v1/conversations/${conversationId}/members/${userId}/role`,  // ❌ hardcode
  { role } as ChangeRoleRequest
);
```

**After (ถูกต้อง):**
```typescript
import { GROUP_API } from '@/constants/api/standardApiConstants';

await apiService.patch(
  GROUP_API.UPDATE_MEMBER_ROLE(conversationId, userId),  // ✅ ใช้ constant
  { role } as ChangeRoleRequest
);
```

---

### 3. แก้ไขทุก Function

#### updateMemberRole
```typescript
await apiService.patch(
  GROUP_API.UPDATE_MEMBER_ROLE(conversationId, userId),
  { role } as ChangeRoleRequest
);
```

#### transferOwnership
```typescript
await apiService.post(
  GROUP_API.TRANSFER_OWNERSHIP(conversationId),
  { new_owner_id: newOwnerId } as TransferOwnershipRequest
);
```

#### getActivities
```typescript
const response = await apiService.get<{ data: ActivitiesResponse }>(
  GROUP_API.GET_ACTIVITIES(conversationId),
  params
);
```

---

## 📊 โครงสร้างที่ถูกต้อง

### API Constants Pattern

```typescript
// ❌ ไม่ถูกต้อง - hardcode ใน service
export async function someFunction() {
  await apiService.get('/api/v1/some/path');  // ❌ URL ซ้ำ
}

// ✅ ถูกต้อง - ใช้ constants
// 1. ประกาศใน constants/api/standardApiConstants.ts
export const SOME_API = {
  SOME_ENDPOINT: (id: string) => `${API_BASE_URL}/some/${id}/path`,
};

// 2. ใช้ใน service
import { SOME_API } from '@/constants/api/standardApiConstants';

export async function someFunction(id: string) {
  await apiService.get(SOME_API.SOME_ENDPOINT(id));  // ✅ ถูกต้อง
}
```

---

## 🔍 การตรวจสอบ

### ตรวจสอบว่า URL ถูกต้อง

**วิธีที่ 1: ดูใน Network Tab**
```
✅ ถูกต้อง: https://b01.ngrok.dev/api/v1/conversations/.../activities
❌ ผิด:     https://b01.ngrok.dev/api/v1/api/v1/conversations/.../activities
```

**วิธีที่ 2: console.log ใน apiService**
```typescript
console.log('Calling API:', url);
// ควรได้ URL ที่ไม่ซ้ำซ้อน
```

---

## 📁 ไฟล์ที่แก้ไข

### 1. standardApiConstants.ts
- ✅ เพิ่ม GROUP_API object
- ✅ เพิ่ม GROUP_API ใน default export

### 2. groupService.ts
- ✅ Import GROUP_API
- ✅ แก้ไข updateMemberRole ใช้ GROUP_API.UPDATE_MEMBER_ROLE
- ✅ แก้ไข transferOwnership ใช้ GROUP_API.TRANSFER_OWNERSHIP
- ✅ แก้ไข getActivities ใช้ GROUP_API.GET_ACTIVITIES

---

## ✅ ผลลัพธ์

**TypeScript Errors:** 0 (ไม่มี error)

**URL ที่ถูกสร้าง:**
```
✅ PATCH /api/v1/conversations/{id}/members/{userId}/role
✅ POST  /api/v1/conversations/{id}/transfer-ownership
✅ GET   /api/v1/conversations/{id}/activities?limit=20&offset=0
```

**ไม่ซ้ำซ้อน `/api/v1/api/v1/` อีกต่อไป!**

---

## 📚 Best Practices

### 1. ไม่ Hardcode URLs
```typescript
// ❌ ไม่ควรทำ
await apiService.get('/api/v1/some/path');

// ✅ ควรทำ
await apiService.get(SOME_API.SOME_ENDPOINT(id));
```

### 2. ประกาศ Constants ที่ standardApiConstants.ts
```typescript
export const YOUR_FEATURE_API = {
  ENDPOINT_NAME: (id: string) => `${API_BASE_URL}/your/path/${id}`,
};
```

### 3. Import Constants ใน Service
```typescript
import { YOUR_FEATURE_API } from '@/constants/api/standardApiConstants';
```

### 4. ใช้ Constants แทน Hardcode
```typescript
await apiService.get(YOUR_FEATURE_API.ENDPOINT_NAME(id));
```

---

## 🎯 สรุป

**ปัญหา:**
- Hardcode URL path ใน service
- ไม่ทำตามโครงสร้างที่มีอยู่

**การแก้ไข:**
1. เพิ่ม GROUP_API ใน standardApiConstants.ts
2. แก้ไข groupService.ts ให้ใช้ GROUP_API
3. ตรวจสอบว่าไม่มี TypeScript errors

**ผลลัพธ์:**
- ✅ URL ไม่ซ้ำซ้อนแล้ว
- ✅ ทำตามโครงสร้างที่ถูกต้อง
- ✅ ง่ายต่อการ maintain ในอนาคต

---

**สถานะ:** แก้ไขเสร็จสมบูรณ์ ✅
**Last Updated:** 2025-11-28
