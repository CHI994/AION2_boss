import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle } from "lucide-react";
import { BossWithStatus } from "@/types/boss";
import { formatCountdown } from "@/utils/bossUtils";

interface UpcomingBossDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bosses: BossWithStatus[];
  groupName: string;
  groupIcon: string;
}

export const UpcomingBossDialog = ({ 
  isOpen, 
  onOpenChange, 
  bosses, 
  groupName,
  groupIcon 
}: UpcomingBossDialogProps) => {
  // 篩選5分鐘內重生的BOSS
  const upcomingBosses = bosses.filter(boss => {
    if (!boss.nextRespawnTime) return false;
    const now = new Date();
    const respawnTime = new Date(boss.nextRespawnTime);
    const timeDiff = respawnTime.getTime() - now.getTime();
    const minutesUntilRespawn = timeDiff / (1000 * 60);
    return minutesUntilRespawn > 0 && minutesUntilRespawn <= 5;
  }).sort((a, b) => {
    // 按重生時間排序，最快重生的在前
    const timeA = a.nextRespawnTime ? new Date(a.nextRespawnTime).getTime() : 0;
    const timeB = b.nextRespawnTime ? new Date(b.nextRespawnTime).getTime() : 0;
    return timeA - timeB;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-yellow-500 animate-pulse" />
            <span className="text-yellow-500">即將重生的BOSS</span>
            <span className="text-lg text-muted-foreground">({groupIcon} {groupName})</span>
          </DialogTitle>
        </DialogHeader>
        
        {upcomingBosses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">目前沒有5分鐘內即將重生的BOSS</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingBosses.map((boss) => {
              const now = new Date();
              const respawnTime = new Date(boss.nextRespawnTime!);
              const timeDiff = respawnTime.getTime() - now.getTime();
              const secondsUntilRespawn = Math.floor(timeDiff / 1000);
              const countdown = formatCountdown(secondsUntilRespawn);
              
              // 根據剩餘時間設定顏色
              let urgencyColor = "text-yellow-500";
              let bgColor = "bg-yellow-500/10";
              let borderColor = "border-yellow-500/30";
              
              if (secondsUntilRespawn <= 60) {
                urgencyColor = "text-red-500";
                bgColor = "bg-red-500/10";
                borderColor = "border-red-500/30";
              } else if (secondsUntilRespawn <= 180) {
                urgencyColor = "text-orange-500";
                bgColor = "bg-orange-500/10";
                borderColor = "border-orange-500/30";
              }
              
              return (
                <div 
                  key={boss.name}
                  className={`p-4 rounded-lg border-2 ${bgColor} ${borderColor} transition-all duration-300`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl ${secondsUntilRespawn <= 60 ? 'animate-bounce' : 'animate-pulse'}`}>
                        ⚔️
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{boss.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          重生時間: {respawnTime.toLocaleTimeString('zh-TW')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className={`h-5 w-5 ${urgencyColor} animate-pulse`} />
                      <span className={`text-2xl font-mono font-bold ${urgencyColor}`}>
                        {countdown}
                      </span>
                      {secondsUntilRespawn <= 60 && (
                        <Badge variant="destructive" className="animate-pulse ml-2">
                          即將重生！
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* 進度條 */}
                  <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        secondsUntilRespawn <= 60 ? 'bg-red-500' : 
                        secondsUntilRespawn <= 180 ? 'bg-orange-500' : 
                        'bg-yellow-500'
                      } transition-all duration-1000 animate-pulse`}
                      style={{ 
                        width: `${Math.max(0, Math.min(100, (300 - secondsUntilRespawn) / 300 * 100))}%` 
                      }}
                    />
                  </div>
                </div>
              );
            })}
            
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm text-muted-foreground text-center">
                共有 <span className="font-bold text-yellow-500">{upcomingBosses.length}</span> 個BOSS即將在5分鐘內重生
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};