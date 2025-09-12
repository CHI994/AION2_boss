import { Boss, BossWithStatus, BossStatus } from '../types/boss';

export const formatTime = (date: Date): string => {
  return date.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

export const getTaiwanTime = (): Date => {
  return new Date();
};

export const calculateBossStatus = (boss: Boss): BossWithStatus => {
  const now = getTaiwanTime();
  
  if (!boss.lastKilled) {
    return {
      ...boss,
      status: BossStatus.ALIVE,
    };
  }

  const lastKilledTime = new Date(boss.lastKilled);
  let respawnTime = new Date(lastKilledTime.getTime() + boss.respawnMinutes * 60 * 1000);
  let timeDiff = respawnTime.getTime() - now.getTime();

  // 如果重生時間已過，BOSS應該是存活狀態，但仍顯示下一個理論重生時間
  if (timeDiff <= 0) {
    // 計算下一個理論重生時間（如果再次被殺的話）
    const timePassed = now.getTime() - respawnTime.getTime();
    const cyclesPassed = Math.floor(timePassed / (boss.respawnMinutes * 60 * 1000)) + 1;
    const nextTheoreticalRespawn = new Date(lastKilledTime.getTime() + (boss.respawnMinutes * 60 * 1000) * (cyclesPassed + 1));
    
    return {
      ...boss,
      status: BossStatus.ALIVE,
      nextRespawnTime: nextTheoreticalRespawn.toISOString(),
      formattedRespawnTime: `可擊殺 (理論下次: ${formatTime(nextTheoreticalRespawn)})`,
    };
  }

  const timeUntilRespawnSeconds = Math.floor(timeDiff / 1000);
  const isWarning = timeUntilRespawnSeconds <= 300 && timeUntilRespawnSeconds > 0; // 5分鐘 = 300秒

  return {
    ...boss,
    status: BossStatus.RESPAWNING,
    timeUntilRespawn: timeUntilRespawnSeconds,
    formattedRespawnTime: formatTime(respawnTime),
    nextRespawnTime: respawnTime.toISOString(),
    isWarning,
  };
};

export const formatCountdown = (seconds: number): string => {
  if (seconds <= 0) return '00:00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const getBossStatusColor = (status: BossStatus): string => {
  switch (status) {
    case BossStatus.ALIVE:
      return 'text-boss-alive';
    case BossStatus.DEAD:
      return 'text-boss-dead';
    case BossStatus.RESPAWNING:
      return 'text-boss-respawning';
    default:
      return 'text-muted-foreground';
  }
};

export const getBossStatusText = (status: BossStatus): string => {
  switch (status) {
    case BossStatus.ALIVE:
      return '存活';
    case BossStatus.DEAD:
      return '死亡';
    case BossStatus.RESPAWNING:
      return '重生中';
    default:
      return '未知';
  }
};