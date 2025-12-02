/**
 * หน้าทดสอบ File Upload Utilities
 * ทดสอบ: Images, Videos, Documents - Validation, Metadata, Thumbnail, File Detection
 */

import React, { useState } from 'react';
import { validateVideoFile, formatFileSize } from '@/utils/video/videoValidation';
import { extractVideoMetadata, formatDuration, getQualityLabel } from '@/utils/video/videoMetadata';
import { generateVideoThumbnailDataURL } from '@/utils/video/videoThumbnail';
import { getFileCategory, getFileIcon } from '@/utils/file/fileTypeDetection';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';

interface TestResult {
  validation?: {
    valid: boolean;
    error?: string;
  };
  metadata?: {
    duration: number;
    width: number;
    height: number;
    aspectRatio: string;
    quality: string;
  };
  thumbnailUrl?: string;
  imagePreview?: string; // For image files
  fileInfo?: {
    name: string;
    size: string;
    type: string;
    category: string;
    icon: string;
  };
}

const VideoUploadTest: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag & Drop - Now supports all file types
  const { isDragging, dragHandlers } = useDragAndDrop({
    onDrop: (files) => {
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    onError: (err) => {
      setError(err.message);
    },
    accept: ['image/*', 'video/*', 'audio/*', 'application/*', 'text/*'], // All file types
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024 // 100MB
  });

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setTestResult(null);
    setError(null);
    setLoading(true);

    try {
      const result: TestResult = {};

      // 1. Test File Type Detection (all files)
      console.log('🔍 Testing file type detection...');
      const category = getFileCategory(file);
      const icon = getFileIcon(file);
      result.fileInfo = {
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type,
        category,
        icon
      };

      // 2. Handle based on file category
      if (category === 'video') {
        // Video: Validate, extract metadata, generate thumbnail
        console.log('🎬 Processing video file...');

        const validation = validateVideoFile(file);
        result.validation = {
          valid: validation.valid,
          error: validation.error?.message
        };

        if (!validation.valid) {
          setTestResult(result);
          setLoading(false);
          return;
        }

        console.log('🔍 Extracting video metadata...');
        const metadata = await extractVideoMetadata(file);
        result.metadata = {
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.aspectRatio || '16:9',
          quality: getQualityLabel(metadata.width, metadata.height)
        };

        console.log('🔍 Generating video thumbnail...');
        const thumbnailUrl = await generateVideoThumbnailDataURL(file, {
          timeInSeconds: 1,
          maxWidth: 640,
          maxHeight: 360,
          quality: 0.8
        });
        result.thumbnailUrl = thumbnailUrl;

      } else if (category === 'image') {
        // Image: Just generate preview
        console.log('🖼️ Processing image file...');
        result.validation = { valid: true };

        const imageUrl = URL.createObjectURL(file);
        result.imagePreview = imageUrl;

      } else {
        // Other files: Just show file info
        console.log('📄 Processing file...');
        result.validation = { valid: true };
      }

      setTestResult(result);
      console.log('✅ All tests passed!', result);
    } catch (err) {
      console.error('❌ Test failed:', err);
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const resetTest = () => {
    setSelectedFile(null);
    setTestResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          📁 File Upload Utilities Test
        </h1>
        <p className="text-muted-foreground mb-8">
          ทดสอบ Images, Videos, Documents - validation, metadata, thumbnails
        </p>

        {/* File Input Area */}
        <div
          {...dragHandlers}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-border bg-card hover:border-primary/50'
          }`}
        >
          <input
            type="file"
            accept="image/*,video/*,audio/*,application/*,text/*"
            onChange={handleFileInputChange}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <div className="text-6xl mb-4">📎</div>
            <p className="text-lg font-medium text-foreground mb-2">
              {isDragging ? 'วางไฟล์ที่นี่' : 'คลิกหรือลากไฟล์ใดก็ได้มาที่นี่'}
            </p>
            <p className="text-sm text-muted-foreground">
              รองรับ: รูปภาพ, วิดีโอ, เอกสาร, และไฟล์อื่นๆ (สูงสุด 100MB)
            </p>
          </label>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mt-8 p-6 bg-card rounded-lg border border-border">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <p className="text-foreground">กำลังทดสอบ...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-8 p-6 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-destructive font-medium">❌ Error: {error}</p>
          </div>
        )}

        {/* Test Results */}
        {testResult && !loading && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">📊 Test Results</h2>
              <button
                onClick={resetTest}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                ทดสอบใหม่
              </button>
            </div>

            {/* File Info */}
            {testResult.fileInfo && (
              <div className="p-6 bg-card rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  📄 File Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="text-foreground font-medium">{testResult.fileInfo.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size:</span>
                    <p className="text-foreground font-medium">{testResult.fileInfo.size}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MIME Type:</span>
                    <p className="text-foreground font-medium">{testResult.fileInfo.type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <p className="text-foreground font-medium">
                      {testResult.fileInfo.category} ({testResult.fileInfo.icon})
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Result */}
            {testResult.validation && (
              <div className={`p-6 rounded-lg border ${
                testResult.validation.valid
                  ? 'bg-green-500/10 border-green-500'
                  : 'bg-destructive/10 border-destructive'
              }`}>
                <h3 className="text-lg font-semibold mb-4">
                  {testResult.validation.valid ? '✅ Validation Passed' : '❌ Validation Failed'}
                </h3>
                {testResult.validation.error && (
                  <p className="text-destructive">{testResult.validation.error}</p>
                )}
              </div>
            )}

            {/* Metadata */}
            {testResult.metadata && (
              <div className="p-6 bg-card rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  📹 Video Metadata
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p className="text-foreground font-medium">
                      {formatDuration(testResult.metadata.duration)} ({testResult.metadata.duration}s)
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resolution:</span>
                    <p className="text-foreground font-medium">
                      {testResult.metadata.width} × {testResult.metadata.height}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Aspect Ratio:</span>
                    <p className="text-foreground font-medium">{testResult.metadata.aspectRatio}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quality:</span>
                    <p className="text-foreground font-medium">{testResult.metadata.quality}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Video Thumbnail */}
            {testResult.thumbnailUrl && (
              <div className="p-6 bg-card rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  🖼️ Generated Video Thumbnail
                </h3>
                <img
                  src={testResult.thumbnailUrl}
                  alt="Video thumbnail"
                  className="w-full max-w-2xl rounded-lg border border-border"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Captured at 1 second, max 640×360, quality 0.8
                </p>
              </div>
            )}

            {/* Image Preview */}
            {testResult.imagePreview && (
              <div className="p-6 bg-card rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  🖼️ Image Preview
                </h3>
                <img
                  src={testResult.imagePreview}
                  alt="Image preview"
                  className="w-full max-w-2xl rounded-lg border border-border"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Original image preview
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!selectedFile && !loading && (
          <div className="mt-8 p-6 bg-card rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              📝 วิธีทดสอบ
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>เลือกไฟล์ใดก็ได้ (รูปภาพ, วิดีโอ, เอกสาร) - คลิก หรือ ลากวาง</li>
              <li>ระบบจะตรวจสอบประเภทไฟล์อัตโนมัติ</li>
              <li><strong>วิดีโอ:</strong> ทดสอบ validation, extract metadata, สร้าง thumbnail</li>
              <li><strong>รูปภาพ:</strong> แสดง preview ทันที</li>
              <li><strong>ไฟล์อื่นๆ:</strong> แสดงข้อมูลไฟล์</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploadTest;
