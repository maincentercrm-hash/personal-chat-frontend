# 📱 Frontend Implementation Plan: Multi-File Upload (Telegram-like)

**วันที่**: 2025-01-27
**ทีม**: Frontend
**เป้าหมาย**: รองรับการส่งหลายไฟล์ใน 1 message พร้อม Album Grid Display

---

## 📋 Table of Contents

1. [สถานะปัจจุบัน](#สถานะปัจจุบัน)
2. [สิ่งที่ต้องทำ](#สิ่งที่ต้องทำ)
3. [Phase-by-Phase Plan](#implementation-phases)
4. [Component Architecture](#component-architecture)
5. [File Upload Flow](#file-upload-flow)
6. [UI/UX Design](#uiux-design)
7. [Testing Plan](#testing-plan)
8. [Timeline](#timeline)

---

## 🔍 สถานะปัจจุบัน

### ✅ สิ่งที่มีอยู่แล้ว (Phase 1-2 เสร็จแล้ว)

#### 1. Utility Functions
- ✅ `src/utils/video/videoValidation.ts` - Video validation
- ✅ `src/utils/video/videoMetadata.ts` - Extract video metadata
- ✅ `src/utils/video/videoThumbnail.ts` - Generate video thumbnails
- ✅ `src/utils/file/fileTypeDetection.ts` - Detect file types

#### 2. Hooks
- ✅ `src/hooks/useDragAndDrop.ts` - Drag & drop functionality (รองรับหลายไฟล์แล้ว)
- ✅ `src/hooks/useVideoUpload.ts` - Video upload workflow

#### 3. Test Page
- ✅ `src/pages/VideoUploadTest.tsx` - รองรับทุกประเภทไฟล์ (images, videos, documents)

### ❌ สิ่งที่ยังไม่มี

1. ❌ Multi-file selection UI in MessageInput
2. ❌ File preview grid (before sending)
3. ❌ Album display component (after sending)
4. ❌ Bulk upload API integration
5. ❌ Album lightbox/viewer
6. ❌ Upload progress tracking for multiple files

---

## 🎯 สิ่งที่ต้องทำ

### 1. Update MessageInput Component
- เพิ่มปุ่ม "Attach Files" (📎)
- รองรับการเลือกหลายไฟล์
- แสดง preview grid ก่อนส่ง
- รองรับ drag & drop หลายไฟล์

### 2. สร้าง Multi-File Preview Component
- แสดง thumbnails ของไฟล์ที่เลือก
- ปุ่มลบแต่ละไฟล์
- Input caption (ข้อความ)
- Progress bar ขณะ upload

### 3. สร้าง Album Display Component
- Grid layout (2x2, 1+2, etc.)
- Responsive design
- แสดง caption
- คลิกเปิด lightbox

### 4. สร้าง Album Lightbox Component
- แสดงรูปเต็ม
- เลื่อนดูรูปต่อไป/ก่อนหน้า
- ซูมได้
- แสดง caption และ metadata

### 5. API Integration
- เชื่อมต่อ Bulk Upload API
- Upload หลายไฟล์แบบ parallel
- Error handling
- Retry mechanism

---

## 🚀 Implementation Phases

### Phase 3: Multi-File Selection & Preview (3-4 ชั่วโมง)

#### 3.1 อัพเดท MessageInput Component
**File**: `src/components/shared/MessageInput.tsx` (หรือ `MessageInputArea.tsx`)

**Features**:
- เพิ่มปุ่ม "📎 Attach Files"
- รองรับ `multiple` attribute ใน file input
- Integrate `useDragAndDrop` hook (ตั้ง `maxFiles` เป็น 10)
- จัดการ state สำหรับ selected files

**Example**:
```tsx
const [selectedFiles, setSelectedFiles] = useState<File[]>([])

const { isDragging, dragHandlers } = useDragAndDrop({
  onDrop: (files) => {
    setSelectedFiles(prev => [...prev, ...files].slice(0, 10))
  },
  accept: ['image/*', 'video/*'],
  maxFiles: 10,
  maxSize: 100 * 1024 * 1024
})

const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || [])
  setSelectedFiles(prev => [...prev, ...files].slice(0, 10))
}
```

#### 3.2 สร้าง Multi-File Preview Component
**New File**: `src/components/shared/MultiFilePreview.tsx`

**Props**:
```typescript
interface MultiFilePreviewProps {
  files: File[]
  onRemove: (index: number) => void
  onCaptionChange: (caption: string) => void
  uploading?: boolean
  uploadProgress?: number
}
```

**Features**:
- Grid layout แสดง thumbnails
- แต่ละไฟล์มีปุ่ม X สำหรับลบ
- Input field สำหรับใส่ caption
- แสดง file type icon สำหรับไฟล์ที่ไม่ใช่รูป
- Show file size และ name

**Layout**:
```
┌──────────────────────────────────────┐
│ [🖼️ photo1.jpg]  [🖼️ photo2.jpg]   │
│    ❌ 2.5MB         ❌ 3.1MB         │
│                                      │
│ [🖼️ photo3.jpg]  [🖼️ photo4.jpg]   │
│    ❌ 1.8MB         ❌ 2.2MB         │
│                                      │
│ 💬 Caption: [Holiday trip 🏖️____] │
│                                      │
│ [📤 Send 4 files]  [❌ Cancel]      │
└──────────────────────────────────────┘
```

---

### Phase 4: Bulk Upload Hook (2-3 ชั่วโมง)

#### 4.1 สร้าง useBulkUpload Hook
**New File**: `src/hooks/useBulkUpload.ts`

**Purpose**: จัดการ upload หลายไฟล์ และเรียก Bulk Message API

**Interface**:
```typescript
interface BulkUploadOptions {
  conversationId: string
  onProgress?: (progress: BulkUploadProgress) => void
  onSuccess?: (result: BulkUploadResult) => void
  onError?: (error: Error) => void
}

interface BulkUploadProgress {
  stage: 'uploading' | 'creating_messages' | 'completed' | 'error'
  filesUploaded: number
  totalFiles: number
  currentFile?: string
  overallProgress: number  // 0-100
}

interface BulkUploadResult {
  albumId: string
  messages: MessageDTO[]
}

export const useBulkUpload = (options: BulkUploadOptions) => {
  const uploadFiles = async (files: File[], caption?: string) => {
    // 1. Upload all files to storage (parallel)
    // 2. Generate thumbnails for videos
    // 3. Call bulk message API
    // 4. Return result
  }

  return { uploadFiles, uploading, progress, error, reset }
}
```

**Implementation**:
```typescript
const uploadFiles = async (files: File[], caption?: string) => {
  try {
    setUploading(true)
    updateProgress({ stage: 'uploading', filesUploaded: 0, totalFiles: files.length, overallProgress: 0 })

    // 1. Upload all files to storage
    const uploadPromises = files.map(async (file, index) => {
      const category = getFileCategory(file)

      let mediaUrl: string
      let thumbnailUrl: string | undefined

      if (category === 'image') {
        // Upload image
        const result = await uploadImageToStorage(file)
        mediaUrl = result.url
        thumbnailUrl = result.url // Same as original for images

      } else if (category === 'video') {
        // Generate thumbnail first
        const thumbnailBlob = await generateVideoThumbnail(file)

        // Upload video and thumbnail in parallel
        const [videoResult, thumbResult] = await Promise.all([
          uploadFileToStorage(file),
          uploadImageToStorage(new File([thumbnailBlob], 'thumb.jpg'))
        ])

        mediaUrl = videoResult.url
        thumbnailUrl = thumbResult.url

      } else {
        // Upload file
        const result = await uploadFileToStorage(file)
        mediaUrl = result.url
      }

      updateProgress({
        stage: 'uploading',
        filesUploaded: index + 1,
        totalFiles: files.length,
        currentFile: file.name,
        overallProgress: ((index + 1) / files.length) * 70  // 0-70%
      })

      return {
        message_type: category === 'image' ? 'image' : category === 'video' ? 'video' : 'file',
        media_url: mediaUrl,
        media_thumbnail_url: thumbnailUrl,
        caption: index === 0 ? caption : undefined
      }
    })

    const uploadedFiles = await Promise.all(uploadPromises)

    // 2. Call bulk message API
    updateProgress({ stage: 'creating_messages', filesUploaded: files.length, totalFiles: files.length, overallProgress: 80 })

    const response = await fetch(`/api/v1/messages/${options.conversationId}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ messages: uploadedFiles })
    })

    if (!response.ok) {
      throw new Error('Failed to send bulk messages')
    }

    const result = await response.json()

    updateProgress({ stage: 'completed', filesUploaded: files.length, totalFiles: files.length, overallProgress: 100 })
    options.onSuccess?.(result.data)

    return result.data

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Upload failed')
    updateProgress({ stage: 'error', filesUploaded: 0, totalFiles: files.length, overallProgress: 0 })
    options.onError?.(err)
    throw err
  } finally {
    setUploading(false)
  }
}
```

---

### Phase 5: Album Display Component (2-3 ชั่วโมง)

#### 5.1 สร้าง AlbumMessage Component
**New File**: `src/components/shared/message/AlbumMessage.tsx`

**Purpose**: แสดง album (หลายรูป) ใน message list

**Props**:
```typescript
interface AlbumMessageProps {
  messages: MessageDTO[]  // Messages ที่มี album_id เดียวกัน
  albumId: string
  caption?: string
  onImageClick?: (messageId: string, imageIndex: number) => void
}
```

**Features**:
- Grid layout (dynamic based on count)
- 2 photos → 1x2
- 3 photos → 1 large + 2 small
- 4 photos → 2x2
- 5-9 photos → 3x3
- 10 photos → Max count badge "+10"

**Example Layout**:
```tsx
const AlbumMessage: React.FC<AlbumMessageProps> = ({ messages, albumId, caption, onImageClick }) => {
  const sortedMessages = messages.sort((a, b) =>
    (a.metadata?.album_position || 0) - (b.metadata?.album_position || 0)
  )

  const gridClass = getGridClass(messages.length)

  return (
    <div className="album-message">
      <div className={`album-grid ${gridClass}`}>
        {sortedMessages.map((msg, index) => (
          <div
            key={msg.id}
            className="album-item"
            onClick={() => onImageClick?.(msg.id, index)}
          >
            <img
              src={msg.media_thumbnail_url || msg.media_url}
              alt=""
              className="album-thumbnail"
            />
            {msg.message_type === 'video' && (
              <div className="video-indicator">
                <PlayIcon />
              </div>
            )}
          </div>
        ))}
      </div>

      {caption && (
        <p className="album-caption">{caption}</p>
      )}

      <div className="album-metadata">
        <span>{messages.length} items</span>
        <span>{formatTime(messages[0].created_at)}</span>
      </div>
    </div>
  )
}
```

**CSS** (`src/index.css` or component CSS):
```css
/* 2 photos - 1x2 */
.album-grid.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  max-width: 400px;
}

.album-grid.grid-2 .album-item {
  aspect-ratio: 1;
}

/* 3 photos - 1 large + 2 small */
.album-grid.grid-3 {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 4px;
  max-width: 400px;
}

.album-grid.grid-3 .album-item:first-child {
  grid-row: 1 / 3;
}

/* 4 photos - 2x2 */
.album-grid.grid-4 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 4px;
  max-width: 400px;
}

.album-grid.grid-4 .album-item {
  aspect-ratio: 1;
}

/* 5-9 photos - 3x3 */
.album-grid.grid-5,
.album-grid.grid-6,
.album-grid.grid-7,
.album-grid.grid-8,
.album-grid.grid-9 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  max-width: 400px;
}

/* Album item */
.album-item {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
  background: var(--muted);
}

.album-item:hover {
  opacity: 0.9;
}

.album-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  padding: 12px;
  color: white;
}

.album-caption {
  margin-top: 8px;
  color: var(--foreground);
  font-size: 14px;
}

.album-metadata {
  margin-top: 4px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--muted-foreground);
}
```

#### 5.2 อัพเดท Message List
**Files to update**:
- `src/components/shared/SimpleMessageList.tsx`
- `src/components/shared/VirtualMessageList.tsx`

**Changes**:
1. Group messages by `album_id` (from metadata)
2. แสดง `AlbumMessage` แทน individual messages
3. ส่ง album messages เข้า component

**Example**:
```typescript
// Helper function to group messages
const groupMessagesByAlbum = (messages: MessageDTO[]) => {
  const grouped: Record<string, MessageDTO[]> = {}
  const standalone: MessageDTO[] = []

  messages.forEach(msg => {
    const albumId = msg.metadata?.album_id
    if (albumId) {
      if (!grouped[albumId]) {
        grouped[albumId] = []
      }
      grouped[albumId].push(msg)
    } else {
      standalone.push(msg)
    }
  })

  return { grouped, standalone }
}

// In component
const { grouped, standalone } = groupMessagesByAlbum(messages)

// Render
{Object.entries(grouped).map(([albumId, albumMessages]) => (
  <AlbumMessage
    key={albumId}
    albumId={albumId}
    messages={albumMessages}
    caption={albumMessages[0]?.metadata?.album_caption}
    onImageClick={handleOpenLightbox}
  />
))}

{standalone.map(msg => (
  <RegularMessage key={msg.id} message={msg} />
))}
```

---

### Phase 6: Album Lightbox (2-3 ชั่วโมง)

#### 6.1 สร้าง AlbumLightbox Component
**New File**: `src/components/shared/AlbumLightbox.tsx`

**Purpose**: แสดงรูปเต็มจอ พร้อมเลื่อนดูรูปต่อไป/ก่อนหน้า

**Props**:
```typescript
interface AlbumLightboxProps {
  messages: MessageDTO[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
}
```

**Features**:
- Full-screen overlay
- แสดงรูปขนาดเต็ม
- ปุ่ม ◀️ ▶️ เลื่อนดู
- ปุ่ม ✕ ปิด
- Keyboard navigation (Arrow keys, Escape)
- Zoom in/out (optional)
- แสดง caption และ metadata

**Example**:
```tsx
const AlbumLightbox: React.FC<AlbumLightboxProps> = ({ messages, initialIndex, isOpen, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex])

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : messages.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex(prev => (prev < messages.length - 1 ? prev + 1 : 0))
  }

  if (!isOpen) return null

  const currentMessage = messages[currentIndex]

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        {/* Close button */}
        <button className="lightbox-close" onClick={onClose}>✕</button>

        {/* Navigation */}
        {messages.length > 1 && (
          <>
            <button className="lightbox-prev" onClick={handlePrev}>◀</button>
            <button className="lightbox-next" onClick={handleNext}>▶</button>
          </>
        )}

        {/* Image/Video */}
        {currentMessage.message_type === 'video' ? (
          <video
            src={currentMessage.media_url}
            controls
            className="lightbox-media"
          />
        ) : (
          <img
            src={currentMessage.media_url}
            alt=""
            className="lightbox-media"
          />
        )}

        {/* Info */}
        <div className="lightbox-info">
          <div className="lightbox-counter">
            {currentIndex + 1} / {messages.length}
          </div>
          {currentMessage.metadata?.album_caption && (
            <div className="lightbox-caption">
              {currentMessage.metadata.album_caption}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**CSS**:
```css
.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.lightbox-media {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  font-size: 32px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10000;
}

.lightbox-prev,
.lightbox-next {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  font-size: 32px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  cursor: pointer;
}

.lightbox-prev {
  left: 20px;
}

.lightbox-next {
  right: 20px;
}

.lightbox-info {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  color: white;
}

.lightbox-counter {
  font-size: 14px;
  margin-bottom: 8px;
  opacity: 0.8;
}

.lightbox-caption {
  font-size: 16px;
  max-width: 600px;
}
```

---

## 🎨 UI/UX Design

### Design Principles
1. **Telegram-like Experience**: Grid layout, smooth interactions
2. **Progressive Disclosure**: แสดงเฉพาะที่จำเป็น
3. **Responsive**: ทำงานได้ทั้ง Desktop และ Mobile
4. **Performance**: Lazy load images, optimize rendering
5. **Accessibility**: Keyboard navigation, ARIA labels

### User Flows

#### Flow 1: Send Multiple Images
```
1. User clicks 📎 button or drags files
   ↓
2. File picker opens (multiple selection enabled)
   ↓
3. User selects 4 photos
   ↓
4. MultiFilePreview shows thumbnails in grid
   ↓
5. User adds caption "Holiday trip 🏖️"
   ↓
6. User clicks "Send"
   ↓
7. Progress bar shows upload (0-100%)
   ↓
8. Album appears in message list
   ↓
9. User can click to view full-screen
```

#### Flow 2: View Album
```
1. User sees album in message list (grid layout)
   ↓
2. User clicks on any photo
   ↓
3. Lightbox opens showing full-size image
   ↓
4. User can navigate using ◀️ ▶️ or arrow keys
   ↓
5. User presses Escape or clicks ✕ to close
```

---

## 🧪 Testing Plan

### Unit Tests

#### 1. Test `useBulkUpload` Hook
```typescript
describe('useBulkUpload', () => {
  test('should upload multiple files successfully', async () => {
    const files = [mockFile1, mockFile2, mockFile3]
    const { result } = renderHook(() => useBulkUpload({ conversationId: 'test' }))

    await act(async () => {
      await result.current.uploadFiles(files, 'Test caption')
    })

    expect(result.current.uploading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  test('should handle upload errors', async () => {
    // Mock API error
    const { result } = renderHook(() => useBulkUpload({ conversationId: 'test' }))

    await expect(
      result.current.uploadFiles([mockFile1])
    ).rejects.toThrow()
  })
})
```

#### 2. Test `AlbumMessage` Component
```typescript
describe('AlbumMessage', () => {
  test('should render grid with correct layout for 4 photos', () => {
    const messages = createMockAlbumMessages(4)
    render(<AlbumMessage messages={messages} albumId="test" />)

    expect(screen.getAllByRole('img')).toHaveLength(4)
    expect(screen.getByText('4 items')).toBeInTheDocument()
  })

  test('should display caption', () => {
    const messages = createMockAlbumMessages(3)
    render(<AlbumMessage messages={messages} albumId="test" caption="Test caption" />)

    expect(screen.getByText('Test caption')).toBeInTheDocument()
  })
})
```

### Integration Tests

#### 1. E2E Test - Send Multiple Files
```typescript
test('User can send multiple images', async () => {
  // 1. Navigate to chat
  await page.goto('/chat/test-conversation')

  // 2. Click attach button
  await page.click('[data-testid="attach-button"]')

  // 3. Upload files
  const fileInput = await page.$('input[type="file"]')
  await fileInput.uploadFile('test1.jpg', 'test2.jpg', 'test3.jpg')

  // 4. Add caption
  await page.fill('[data-testid="caption-input"]', 'Test album')

  // 5. Send
  await page.click('[data-testid="send-button"]')

  // 6. Verify album appears
  await expect(page.locator('.album-message')).toBeVisible()
  await expect(page.locator('.album-item')).toHaveCount(3)
})
```

### Manual Testing Checklist

- [ ] Upload 2, 3, 4, 5, 10 images - verify grid layout
- [ ] Upload mix of images and videos
- [ ] Add caption to album
- [ ] Remove files before sending
- [ ] Cancel upload
- [ ] View album in lightbox
- [ ] Navigate between images in lightbox
- [ ] Test on mobile (responsive)
- [ ] Test drag & drop
- [ ] Test with slow network (progress bar)
- [ ] Test error cases (network failure, file too large)

---

## ⏱️ Timeline

### Week 1
- **Day 1-2**: Phase 3 - Multi-File Selection & Preview (3-4 hours)
- **Day 2-3**: Phase 4 - Bulk Upload Hook (2-3 hours)
- **Day 3-4**: Phase 5 - Album Display Component (2-3 hours)
- **Day 4-5**: Phase 6 - Album Lightbox (2-3 hours)

### Week 2
- **Day 1**: Integration & Bug Fixes (2-3 hours)
- **Day 2**: Testing (Unit + Integration) (3-4 hours)
- **Day 3**: Polish & UX improvements (2-3 hours)
- **Day 4**: Code Review & Deployment (1-2 hours)

**Total**: 15-22 hours (2-3 days of full-time work)

---

## 📦 Dependencies

### New Packages (If Needed)
```json
{
  "react-image-lightbox": "^5.1.4",  // Optional: Pre-built lightbox (หรือจะเขียนเอง)
  "@tanstack/react-virtual": "^3.0.0"  // Optional: Virtual scrolling for large albums
}
```

### Existing Packages (Already Have)
- `react-dropzone` or custom `useDragAndDrop` ✅
- `@tanstack/react-query` for API calls ✅
- Tailwind CSS for styling ✅

---

## 📁 File Structure

```
src/
├── components/
│   └── shared/
│       ├── MessageInput.tsx (update)
│       ├── MessageInputArea.tsx (update)
│       ├── MultiFilePreview.tsx (new)
│       ├── SimpleMessageList.tsx (update)
│       ├── VirtualMessageList.tsx (update)
│       └── message/
│           ├── AlbumMessage.tsx (new)
│           └── AlbumLightbox.tsx (new)
├── hooks/
│   ├── useBulkUpload.ts (new)
│   ├── useDragAndDrop.ts (existing)
│   └── useVideoUpload.ts (existing)
├── utils/
│   ├── video/ (existing)
│   ├── file/ (existing)
│   └── album/
│       └── albumHelpers.ts (new)
│           - getGridClass()
│           - groupMessagesByAlbum()
│           - sortByAlbumPosition()
└── types/
    ├── album.types.ts (new)
    └── message.types.ts (update)
```

---

## 🔒 Validation & Error Handling

### Client-Side Validation
1. **File count**: Max 10 files
2. **File size**: Max 100MB per file
3. **File type**: Images, videos, documents only
4. **Total size**: Warn if total > 500MB

### Error Messages
```typescript
const ERROR_MESSAGES = {
  TOO_MANY_FILES: 'สามารถเลือกได้สูงสุด 10 ไฟล์',
  FILE_TOO_LARGE: 'ไฟล์ต้องมีขนาดไม่เกิน 100MB',
  INVALID_TYPE: 'รองรับเฉพาะไฟล์รูปภาพ วิดีโอ และเอกสาร',
  UPLOAD_FAILED: 'การอัปโหลดล้มเหลว กรุณาลองใหม่อีกครั้ง',
  NETWORK_ERROR: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
}
```

### Retry Logic
```typescript
const uploadWithRetry = async (file: File, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadFile(file)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await delay(1000 * (i + 1)) // Exponential backoff
    }
  }
}
```

---

## 🎯 Success Metrics

### Performance Goals
- [ ] Upload 10 files < 30 seconds (on average network)
- [ ] Grid renders < 100ms
- [ ] Lightbox opens < 200ms
- [ ] No layout shift when loading images

### UX Goals
- [ ] Intuitive file selection (drag & drop + button)
- [ ] Clear upload progress
- [ ] Smooth animations
- [ ] Keyboard navigation works

### Code Quality
- [ ] 80%+ test coverage
- [ ] No TypeScript errors
- [ ] No console warnings
- [ ] Passes ESLint rules

---

## 🚦 Ready to Start?

### Prerequisites
- [x] Backend implements Bulk Upload API (`POST /messages/:conversationId/bulk`)
- [x] File upload APIs ready (`POST /files/image`, `/files/file`)
- [x] WebSocket supports album notifications
- [x] Phase 1-2 utilities completed ✅

### Next Steps
1. ✅ Review this plan
2. ⏳ Wait for Backend API completion
3. 🚀 Start Phase 3 implementation
4. 🧪 Test each phase incrementally
5. 🎨 Polish & optimize

---

**Created by**: Frontend Team
**Last updated**: 2025-01-27
**Status**: Ready to implement (waiting for Backend API)
