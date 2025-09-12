export const parseTimeString = (timeStr: string): Date | null => {
  if (!timeStr) return null;
  
  // 清理輸入
  const cleanStr = timeStr.trim();
  const currentTime = new Date();
  
  // 優先處理數字格式
  if (/^\d+$/.test(cleanStr)) {
    try {
      if (cleanStr.length === 6) {
        // hhmmss 格式：例如 123045 = 12:30:45
        const hour = parseInt(cleanStr.slice(0, 2));
        const minute = parseInt(cleanStr.slice(2, 4));
        const second = parseInt(cleanStr.slice(4, 6));
        
        if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59) {
          const parsedTime = new Date(currentTime);
          parsedTime.setHours(hour, minute, second, 0);
          return parsedTime;
        }
      } else if (cleanStr.length === 10) {
        // mmddhhmmss 格式：例如 1225123045 = 12/25 12:30:45
        const month = parseInt(cleanStr.slice(0, 2)) - 1; // JavaScript months are 0-based
        const day = parseInt(cleanStr.slice(2, 4));
        const hour = parseInt(cleanStr.slice(4, 6));
        const minute = parseInt(cleanStr.slice(6, 8));
        const second = parseInt(cleanStr.slice(8, 10));
        
        if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && 
            hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59) {
          const parsedTime = new Date(currentTime.getFullYear(), month, day, hour, minute, second, 0);
          return parsedTime;
        }
      }
    } catch (error) {
      console.error('Error parsing numeric time format:', error);
    }
  }
  
  // 傳統格式處理
  const formats = [
    // ISO格式
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    // 年月日格式
    /^\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}(:\d{2})?/,
    /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(:\d{2})?/,
    // 月日格式
    /^\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}(:\d{2})?/,
    // 僅時間格式
    /^\d{1,2}:\d{2}(:\d{2})?$/
  ];
  
  try {
    // 嘗試直接解析
    const directParse = new Date(cleanStr);
    if (!isNaN(directParse.getTime())) {
      return directParse;
    }
    
    // 處理月日時間格式 (MM/DD HH:MM 或 MM/DD HH:MM:SS)
    const mdPattern = /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(:(\d{2}))?/;
    const mdMatch = cleanStr.match(mdPattern);
    if (mdMatch) {
      const month = parseInt(mdMatch[1]) - 1;
      const day = parseInt(mdMatch[2]);
      const hour = parseInt(mdMatch[3]);
      const minute = parseInt(mdMatch[4]);
      const second = mdMatch[6] ? parseInt(mdMatch[6]) : 0;
      
      const parsedTime = new Date(currentTime.getFullYear(), month, day, hour, minute, second, 0);
      return parsedTime;
    }
    
    // 處理僅時間格式 (HH:MM 或 HH:MM:SS)
    const timePattern = /^(\d{1,2}):(\d{2})(:(\d{2}))?$/;
    const timeMatch = cleanStr.match(timePattern);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const second = timeMatch[4] ? parseInt(timeMatch[4]) : 0;
      
      const parsedTime = new Date(currentTime);
      parsedTime.setHours(hour, minute, second, 0);
      return parsedTime;
    }
    
  } catch (error) {
    console.error('Error parsing traditional time format:', error);
  }
  
  return null;
};

export const formatTimeForDisplay = (date: Date | null): string => {
  if (!date) return "未設定";
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  return date.toLocaleString('zh-TW', options);
};

export const calculateRespawnTime = (lastKilled: Date | null, respawnMinutes: number): Date | null => {
  if (!lastKilled) return null;
  
  const respawnTime = new Date(lastKilled.getTime() + (respawnMinutes * 60 * 1000));
  return respawnTime;
};

export const getRemainingTime = (respawnTime: Date | null): string => {
  if (!respawnTime) return "未知";
  
  const now = new Date();
  const diff = respawnTime.getTime() - now.getTime();
  
  if (diff <= 0) {
    return "已重生";
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

export const isUrgent = (respawnTime: Date | null): boolean => {
  if (!respawnTime) return false;
  
  const now = new Date();
  const diff = respawnTime.getTime() - now.getTime();
  
  // 5分鐘 = 300秒 = 300000毫秒
  return diff > 0 && diff <= 300000;
};