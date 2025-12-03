// src/utils/messageFormatter.ts
/**
 * แปลงข้อความประเภทต่างๆ จาก API เป็นข้อความที่อ่านได้
 *
 * @param text - ข้อความที่ต้องการแปลง
 * @param hasMention - (Phase 2) ข้อความมี mention ของ current user หรือไม่
 */
export const parseMessageType = (
  text: string | undefined,
  hasMention?: boolean
): string => {
    if (!text) {
      return 'เริ่มการสนทนา';
    }

    // ✅ Phase 2: ตรวจสอบ mention ก่อน (priority สูงสุด)
    if (hasMention) {
      return '@มีผู้กล่าวถึงคุณ';
    }

    // กรณีรูปแบบ [File] ชื่อไฟล์.นามสกุล หรือ [Forwarded] ข้อความ
    if (text.startsWith('[File]') || text.startsWith('[Image]') || text.startsWith('[Video]') || text.startsWith('[Forwarded]')) {
      const fileType = text.match(/^\[(.*?)\]/)?.[1]?.toLowerCase();
      const fileName = text.replace(/^\[(.*?)\]\s*/, '').trim();

      switch (fileType) {
        case 'file':
          return fileName ? `ส่งไฟล์: ${fileName}` : 'ส่งไฟล์';
        case 'image':
          return fileName ? `ส่งรูปภาพ: ${fileName}` : 'ส่งรูปภาพ';
        case 'video':
          return fileName ? `ส่งวิดีโอ: ${fileName}` : 'ส่งวิดีโอ';
        case 'forwarded':
          return fileName ? `ส่งต่อ: ${fileName}` : 'ส่งต่อ';
        default:
          return fileName ? `ส่ง${fileType}: ${fileName}` : `ส่ง${fileType}`;
      }
    }
    
    // กรณีรูปแบบ [ประเภทข้อความ] ทั่วไป
    if (text.startsWith('[') && text.endsWith(']')) {
      // ดึงประเภทข้อความออกมา
      const messageType = text.substring(1, text.length - 1).toLowerCase();
      
      switch (messageType) {
        case 'sticker':
          return 'ส่งสติกเกอร์';
        case 'image':
          return 'ส่งรูปภาพ';
        case 'file':
          return 'ส่งไฟล์';
        case 'voice':
        case 'audio':
          return 'ส่งข้อความเสียง';
        case 'video':
          return 'ส่งวิดีโอ';
        case 'location':
          return 'ส่งตำแหน่ง';
        case 'contact':
          return 'ส่งรายชื่อติดต่อ';
        default:
          return `ส่ง${messageType}`;
      }
    }
    
    // กรณีมีรูปแบบไม่ต้องการอื่นๆ
    if (text === '[...]' || 
        text === '...' ||
        text.includes('[object Object]')) {
      return 'ข้อความใหม่';
    }
    
    return text;
  };