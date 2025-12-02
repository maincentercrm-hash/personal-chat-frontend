/**
 * Hook สำหรับ Drag & Drop functionality
 */

import { useState, useCallback, type DragEvent } from 'react';

export interface UseDragAndDropOptions {
  onDrop: (files: File[]) => void;
  onError?: (error: Error) => void;
  accept?: string[];  // MIME types to accept
  maxFiles?: number;  // Maximum number of files
  maxSize?: number;   // Maximum file size in bytes
}

export const useDragAndDrop = (options: UseDragAndDropOptions) => {
  const [isDragging, setIsDragging] = useState(false);
  const [_dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);
    setDragCounter(0);

    const { files: droppedFiles } = e.dataTransfer;
    if (!droppedFiles || droppedFiles.length === 0) return;

    try {
      // Convert FileList to Array
      const filesArray = Array.from(droppedFiles);

      // Check max files
      if (options.maxFiles && filesArray.length > options.maxFiles) {
        throw new Error(`Maximum ${options.maxFiles} files allowed`);
      }

      // Filter by accept types
      let validFiles = filesArray;
      if (options.accept && options.accept.length > 0) {
        validFiles = filesArray.filter(file =>
          options.accept!.some(type => {
            if (type.endsWith('/*')) {
              const category = type.split('/')[0];
              return file.type.startsWith(category + '/');
            }
            return file.type === type;
          })
        );

        if (validFiles.length === 0) {
          throw new Error('File type not supported');
        }
      }

      // Check file sizes
      if (options.maxSize) {
        const oversizedFiles = validFiles.filter(file => file.size > options.maxSize!);
        if (oversizedFiles.length > 0) {
          throw new Error(`File size exceeds ${(options.maxSize / 1024 / 1024).toFixed(0)}MB limit`);
        }
      }

      options.onDrop(validFiles);
    } catch (error) {
      options.onError?.(error instanceof Error ? error : new Error('Drop failed'));
    }
  }, [options]);

  return {
    isDragging,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop
    }
  };
};
