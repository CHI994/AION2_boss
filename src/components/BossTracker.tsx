import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, RefreshCw, Clock, Zap, Cloud, CloudOff, AlertTriangle } from "lucide-react";
import { GroupConfig, BossData, BossWithStatus, BossStatus } from "@/types/boss";
import { defaultBossData } from "@/data/bossData";
import { calculateBossStatus, formatTime, getTaiwanTime, formatCountdown, getBossStatusColor, getBossStatusText } from "@/utils/bossUtils";
import { parseTimeString } from "@/utils/timeUtils";
import { useToast } from "@/hooks/use-toast";
import { BossDataService } from "@/services/bossDataService";
import { useCloud } from "@/lib/supabase";
import { UpcomingBossDialog } from "@/components/UpcomingBossDialog";

interface BossTrackerProps {
  groupConfig: GroupConfig;
  onBack: () => void;
}

export const BossTracker = ({ groupConfig, onBack }: BossTrackerProps) => {
  const [bossData, setBossData] = useState<BossData>(defaultBossData);
  const [bossesWithStatus, setBossesWithStatus] = useState<BossWithStatus[]>([]);
  const [selectedBoss, setSelectedBoss] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [warningsSent, setWarningsSent] = useState<Set<string>>(new Set()); // 追踪已發送提醒的Boss
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUpcomingDialog, setShowUpcomingDialog] = useState(false);
  const { toast } = useToast();

  // Initialize data service
  const dataService = new BossDataService(groupConfig.filePrefix);

  // 從雲端/localStorage載入數據
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await dataService.loadData();
        setBossData(data);
      } catch (error) {
        console.error('載入Boss數據失敗:', error);
        toast({
          title: "❌ 載入失敗",
          description: "載入Boss數據時發生錯誤，使用預設數據",
          variant: "destructive",
        });
        setBossData(defaultBossData);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [groupConfig.filePrefix]);

  // 儲存數據到雲端/localStorage
  const saveBossData = async (data: BossData) => {
    setIsSyncing(true);
    try {
      const success = await dataService.saveData(data);
      setBossData(data);
      
      if (!success && useCloud) {
        toast({
          title: "⚠️ 同步警告",
          description: "數據已保存到本地，但雲端同步失敗",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('儲存Boss數據失敗:', error);
      toast({
        title: "❌ 儲存失敗", 
        description: "儲存Boss數據時發生錯誤",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 更新Boss狀態和倒數計時
  useEffect(() => {
    const updateBossStatus = () => {
      const updated = Object.values(bossData).map(calculateBossStatus);
      setBossesWithStatus(updated);
      setCurrentTime(formatTime(getTaiwanTime()));

      // 檢查5分鐘提醒
      updated.forEach(boss => {
        if (boss.isWarning && !warningsSent.has(boss.name)) {
          // 發送提醒通知
          const minutes = Math.floor((boss.timeUntilRespawn || 0) / 60);
          const seconds = (boss.timeUntilRespawn || 0) % 60;
          
          toast({
            title: "⚠️ Boss即將重生",
            description: `${boss.name} 還有 ${minutes}:${seconds.toString().padStart(2, '0')} 即將重生！`,
            variant: "default",
          });

          // 記錄已發送提醒
          setWarningsSent(prev => new Set([...prev, boss.name]));
        }

        // 如果Boss重生了，清除提醒記錄
        if (boss.status === 'alive' && warningsSent.has(boss.name)) {
          setWarningsSent(prev => {
            const newSet = new Set(prev);
            newSet.delete(boss.name);
            return newSet;
          });
        }
      });
    };

    updateBossStatus();
    const interval = setInterval(updateBossStatus, 1000);
    return () => clearInterval(interval);
  }, [bossData, warningsSent, toast]);

  // 記錄現在時間
  const recordCurrentTime = async (bossName: string) => {
    const now = getTaiwanTime().toISOString();
    const newData = {
      ...bossData,
      [bossName]: {
        ...bossData[bossName],
        lastKilled: now,
      },
    };
    
    await saveBossData(newData);
    setSelectedBoss(null);
    
    // 清除該Boss的提醒狀態
    setWarningsSent(prev => {
      const newSet = new Set(prev);
      newSet.delete(bossName);
      return newSet;
    });
    
    toast({
      title: "✅ 更新成功",
      description: `已記錄 ${bossName} 的擊殺時間${useCloud ? '並同步到雲端' : ''}`,
    });
  };

  // 手動輸入時間 - 使用增強的解析功能和週期重新計算
  const recordCustomTime = async (bossName: string) => {
    if (!customTime) return;
    
    try {
      const inputDate = parseTimeString(customTime);
      
      if (!inputDate) {
        throw new Error('無法解析時間格式');
      }

      // 智能處理時間，自動調整到合理的週期
      const processedDate = processKillTime(inputDate, bossName);

      setIsSyncing(true);
      try {
        const updatedData = await dataService.updateBoss(bossData, bossName, processedDate.toISOString());
        setBossData(updatedData);
      } catch (error) {
        console.error('Failed to sync boss data:', error);
        // Fallback to local only update
        const newData = {
          ...bossData,
          [bossName]: {
            ...bossData[bossName],
            lastKilled: processedDate.toISOString(),
          },
        };
        setBossData(newData);
      } finally {
        setIsSyncing(false);
      }
      setSelectedBoss(null);
      setCustomTime('');
      
      // 清除該Boss的提醒狀態
      setWarningsSent(prev => {
        const newSet = new Set(prev);
        newSet.delete(bossName);
        return newSet;
      });
      
      const isAdjusted = processedDate.getTime() !== inputDate.getTime();
      toast({
        title: "✅ 更新成功",
        description: isAdjusted 
          ? `已記錄 ${bossName} 的擊殺時間（自動調整到合理週期）`
          : `已記錄 ${bossName} 的擊殺時間`,
      });
    } catch (error) {
      toast({
        title: "❌ 時間格式錯誤",
        description: "支援格式：hhmmss (123045), mmddhhmmss (1225143045), HH:MM, MM/DD HH:MM 等",
        variant: "destructive",
      });
    }
  };

  // 清除Boss記錄
  const clearBossRecord = async (bossName: string) => {
    setIsSyncing(true);
    try {
      const updatedData = await dataService.updateBoss(bossData, bossName, null);
      setBossData(updatedData);
    } catch (error) {
      console.error('Failed to sync boss data:', error);
      // Fallback to local only update
      const newData = {
        ...bossData,
        [bossName]: {
          ...bossData[bossName],
          lastKilled: null,
        },
      };
      setBossData(newData);
    } finally {
      setIsSyncing(false);
    }
    setSelectedBoss(null);
    toast({
      title: "🗑️ 記錄已清除",
      description: `已清除 ${bossName} 的記錄`,
    });
  };

  // 清除所有Boss記錄
  const clearAllRecords = async () => {
    const confirmed = window.confirm("確定要清除所有BOSS的擊殺時間記錄嗎？此操作無法復原。");
    if (confirmed) {
      const newData = Object.keys(bossData).reduce((acc, bossName) => {
        acc[bossName] = {
          ...bossData[bossName],
          lastKilled: null,
        };
        return acc;
      }, {} as typeof bossData);
      
      setIsSyncing(true);
      try {
        await dataService.saveData(newData);
        setBossData(newData);
      } catch (error) {
        console.error('Failed to sync boss data:', error);
        // Fallback to local only update
        setBossData(newData);
      } finally {
        setIsSyncing(false);
      }
      setSelectedBoss(null);
      toast({
        title: "🗑️ 所有記錄已清除",
        description: "已清除所有BOSS的擊殺時間記錄",
      });
    }
  };

  // 智能處理擊殺時間 - 自動調整到合理的週期
  const processKillTime = (inputDate: Date, bossName: string): Date => {
    const now = new Date();
    const boss = bossData[bossName];
    
    // 如果輸入的時間是未來的時間，往前推算到最近的過去時間
    if (inputDate.getTime() > now.getTime()) {
      const respawnMs = boss.respawnMinutes * 60 * 1000;
      const timeDiff = inputDate.getTime() - now.getTime();
      const cyclesInFuture = Math.ceil(timeDiff / respawnMs);
      inputDate = new Date(inputDate.getTime() - (respawnMs * cyclesInFuture));
    }
    
    // 如果輸入的時間太久以前，向前推算到最近的合理時間
    const respawnMs = boss.respawnMinutes * 60 * 1000;
    const maxReasonableAge = respawnMs * 10; // 最多往前推10個週期
    const timeDiff = now.getTime() - inputDate.getTime();
    
    if (timeDiff > maxReasonableAge) {
      const cyclesToAdd = Math.floor((timeDiff - maxReasonableAge) / respawnMs) + 1;
      inputDate = new Date(inputDate.getTime() + (respawnMs * cyclesToAdd));
    }
    
    return inputDate;
  };

  // 手動更新擊殺時間
  const updateKillTime = async (bossName: string, timeStr: string) => {
    try {
      const inputDate = parseTimeString(timeStr);
      
      if (!inputDate) {
        throw new Error('無法解析時間格式');
      }

      // 智能處理時間，自動調整到合理的週期
      const processedDate = processKillTime(inputDate, bossName);

      setIsSyncing(true);
      try {
        const updatedData = await dataService.updateBoss(bossData, bossName, processedDate.toISOString());
        setBossData(updatedData);
      } catch (error) {
        console.error('Failed to sync boss data:', error);
        // Fallback to local only update
        const newData = {
          ...bossData,
          [bossName]: {
            ...bossData[bossName],
            lastKilled: processedDate.toISOString(),
          },
        };
        setBossData(newData);
      } finally {
        setIsSyncing(false);
      }
      
      // 清除該Boss的提醒狀態
      setWarningsSent(prev => {
        const newSet = new Set(prev);
        newSet.delete(bossName);
        return newSet;
      });
      
      const isAdjusted = processedDate.getTime() !== inputDate.getTime();
      toast({
        title: "✅ 時間已更新",
        description: isAdjusted 
          ? `已更新 ${bossName} 的擊殺時間（自動調整到合理週期）`
          : `已更新 ${bossName} 的擊殺時間`,
      });
    } catch (error) {
      toast({
        title: "❌ 時間格式錯誤",
        description: "支援格式：hhmmss (123045), mmddhhmmss (1225143045), HH:MM, MM/DD HH:MM 等",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen p-4" style={{
      background: `radial-gradient(ellipse at top, hsl(var(--primary) / 0.05), hsl(var(--background))),
                   linear-gradient(to bottom, hsl(var(--background)), hsl(var(--muted) / 0.5))`
    }}>
      <div className="max-w-7xl mx-auto">
        {/* 標題欄 */}
        <Card className="mb-6 card-neon" style={{
          background: `linear-gradient(135deg, 
                      hsl(var(--${groupConfig.colorVar}) / 0.1), 
                      hsl(var(--card)),
                      hsl(var(--${groupConfig.colorVar}) / 0.05))`,
          borderColor: `hsl(var(--${groupConfig.colorVar})) / 0.4`,
        }}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className="flex items-center gap-2 hover:bg-primary/10 transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4" />
                返回群組選擇
              </Button>
              <div className="text-center flex-1">
                <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                  <span className="text-4xl animate-pulse-slow">{groupConfig.icon}</span>
                  <span 
                    style={{ color: `hsl(var(--${groupConfig.colorVar}))` }}
                  >
                    {groupConfig.name} Boss追蹤器
                  </span>
                </CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground" title={useCloud ? "雲端同步已啟用" : "本地儲存模式"}>
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
                  ) : useCloud ? (
                    <Cloud className="h-4 w-4 text-green-500" />
                  ) : (
                    <CloudOff className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="text-xs">
                    {isSyncing ? '同步中...' : useCloud ? '雲端' : '本地'}
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowUpcomingDialog(true)}
                  className={`relative transition-all duration-300 ${
                    bossesWithStatus.filter(b => b.isWarning).length > 0 
                      ? 'border-yellow-500/50 hover:border-yellow-500' 
                      : 'hover:bg-primary/10'
                  }`}
                >
                  <AlertTriangle className={`h-4 w-4 mr-1 ${
                    bossesWithStatus.filter(b => b.isWarning).length > 0 
                      ? 'text-yellow-500 animate-pulse' 
                      : 'text-gray-500'
                  }`} />
                  即將重生
                  {bossesWithStatus.filter(b => b.isWarning).length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
                      {bossesWithStatus.filter(b => b.isWarning).length}
                    </span>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearAllRecords}
                  className="text-destructive hover:text-destructive transition-all duration-300"
                >
                  🗑️ 清除所有時間
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 animate-pulse" />
                  <span className="font-mono">{currentTime}</span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Boss表格 */}
        <Card className="card-neon">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-primary/20">
                  <TableHead className="text-center text-primary font-semibold">Boss名稱</TableHead>
                  <TableHead className="text-center text-primary font-semibold">重生時間</TableHead>
                  <TableHead className="text-center text-primary font-semibold">狀態</TableHead>
                  <TableHead className="text-center text-primary font-semibold">上次擊殺</TableHead>
                  <TableHead className="text-center text-primary font-semibold">下次重生時間</TableHead>
                  <TableHead className="text-center text-primary font-semibold">倒數計時</TableHead>
                  <TableHead className="text-center text-primary font-semibold">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bossesWithStatus.map((boss) => (
                  <TableRow 
                    key={boss.name} 
                    className="boss-row-hover cursor-pointer"
                    onClick={() => setSelectedBoss(selectedBoss === boss.name ? null : boss.name)}
                  >
                    <TableCell className="font-semibold text-center">{boss.name}</TableCell>
                    <TableCell className="text-center">
                      {Math.floor(boss.respawnMinutes / 60)}h {boss.respawnMinutes % 60}m
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-semibold ${getBossStatusColor(boss.status)}`}>
                          {getBossStatusText(boss.status)}
                        </span>
                        {boss.nextRespawnTime && boss.lastKilled && 
                         new Date(boss.nextRespawnTime).getTime() > new Date(boss.lastKilled).getTime() + boss.respawnMinutes * 60 * 1000 && (
                          <span className="text-xs text-orange-500" title="已自動進入下一個重生週期">
                            🔄
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {boss.lastKilled ? formatTime(new Date(boss.lastKilled)) : '未記錄'}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {boss.formattedRespawnTime ? (
                        <span className={boss.status === BossStatus.ALIVE ? 'text-green-600' : 'text-blue-600'}>
                          {boss.formattedRespawnTime}
                        </span>
                      ) : boss.nextRespawnTime ? (
                        <span className="text-blue-600">
                          {formatTime(new Date(boss.nextRespawnTime))}
                        </span>
                      ) : boss.lastKilled ? (
                        <span className="text-blue-600">
                          {formatTime(new Date(new Date(boss.lastKilled).getTime() + boss.respawnMinutes * 60 * 1000))}
                        </span>
                      ) : '未設定'}
                    </TableCell>
                    <TableCell className="text-center">
                      {boss.timeUntilRespawn && boss.timeUntilRespawn > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className={`font-mono animate-countdown ${boss.isWarning ? 'text-orange-500 font-bold' : 'text-boss-respawning'}`}>
                            {formatCountdown(boss.timeUntilRespawn)}
                          </span>
                          {boss.isWarning && (
                            <span className="text-orange-500 animate-bounce" title="即將重生警告">
                              ⚠️
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-boss-alive font-semibold">可擊殺</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            recordCurrentTime(boss.name);
                          }}
                          className="hover:bg-primary/20 hover:border-primary/50 hover:text-primary transition-all duration-300"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          記錄
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            const timeInput = prompt(
                              `請輸入 ${boss.name} 的擊殺時間\n\n支援格式：\n• hhmmss (例：143045)\n• mmddhhmmss (例：1225143045)\n• HH:MM (例：14:30)\n• MM/DD HH:MM (例：12/25 14:30)`,
                              boss.lastKilled ? formatTime(new Date(boss.lastKilled)).split(' ')[1] : ''
                            );
                            if (timeInput) {
                              updateKillTime(boss.name, timeInput);
                            }
                          }}
                          title="手動更新時間"
                          className="hover:bg-primary/10 hover:text-primary transition-all duration-300"
                        >
                          ✏️
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 快速操作面板 */}
        {selectedBoss && (
          <Card className="mt-6 border-2 border-dashed border-primary/30 card-neon">
            <CardHeader>
              <CardTitle className="text-center text-primary">
                📝 {selectedBoss} - 快速操作
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                <Button 
                  onClick={() => recordCurrentTime(selectedBoss)} 
                  className="flex items-center gap-2 transition-all duration-300"
                >
                  <Clock className="h-4 w-4" />
                  記錄現在時間
                </Button>
                
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="時間格式: 143045 或 1225143045 或 14:30"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-60 bg-background/50 border-primary/30 focus:border-primary focus:ring-primary/20"
                  />
                  <Button 
                    onClick={() => recordCustomTime(selectedBoss)}
                    disabled={!customTime}
                    className="transition-all duration-300 disabled:opacity-50"
                  >
                    手動記錄
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => updateKillTime(selectedBoss, customTime)}
                    disabled={!customTime}
                    className="hover:bg-primary/20 hover:border-primary/50 transition-all duration-300 disabled:opacity-50"
                  >
                    更新時間
                  </Button>
                </div>
                
                <Button 
                  variant="destructive" 
                  onClick={() => clearBossRecord(selectedBoss)}
                  className="transition-all duration-300"
                >
                  清除記錄
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedBoss(null)}
                  className="hover:bg-primary/10 hover:text-primary transition-all duration-300"
                >
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 即將重生的BOSS對話框 */}
      <UpcomingBossDialog
        isOpen={showUpcomingDialog}
        onOpenChange={setShowUpcomingDialog}
        bosses={bossesWithStatus}
        groupName={groupConfig.name}
        groupIcon={groupConfig.icon}
      />
    </div>
  );
};