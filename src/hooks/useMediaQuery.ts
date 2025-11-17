// src/hook/useMediaQuery.ts

import { useState, useEffect } from 'react';

/**
 * Custom hook สำหรับตรวจสอบ media query
 * @param query คำสั่ง media query เช่น '(max-width: 640px)'
 * @returns boolean ที่บอกว่า media query ตรงตามเงื่อนไขหรือไม่
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    // สร้าง media query
    const media = window.matchMedia(query);
    
    // ตั้งค่าเริ่มต้น
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    // สร้าง listener สำหรับตรวจสอบการเปลี่ยนแปลง
    const listener = () => setMatches(media.matches);
    
    // เพิ่ม event listener
    media.addEventListener('change', listener);
    
    // ทำความสะอาด event listener เมื่อ unmount
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [matches, query]);
  
  return matches;
};

/**
 * Custom hook สำหรับตรวจสอบว่าเป็นอุปกรณ์ mobile หรือไม่ (น้อยกว่า 768px)
 * @returns boolean ที่บอกว่าเป็น mobile หรือไม่
 * ตรงกับ Tailwind breakpoint md: (768px)
 */
export const useIsMobile = (): boolean => {
  return useMediaQuery('(max-width: 767px)');
};

/**
 * Custom hook สำหรับตรวจสอบว่าเป็นอุปกรณ์ tablet หรือไม่ (640px - 1023px)
 * @returns boolean ที่บอกว่าเป็น tablet หรือไม่
 */
export const useIsTablet = (): boolean => {
  return useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
};

/**
 * Custom hook สำหรับตรวจสอบว่าเป็นอุปกรณ์ desktop หรือไม่ (มากกว่า 1024px)
 * @returns boolean ที่บอกว่าเป็น desktop หรือไม่
 */
export const useIsDesktop = (): boolean => {
  return useMediaQuery('(min-width: 1024px)');
};