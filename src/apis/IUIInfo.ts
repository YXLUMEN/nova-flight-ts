export interface WeaponUIInfo {
    // 展示名
    label: string;
    // 进度条颜色
    color: string;
    // 剩余冷却(秒)
    cooldown: number;
    // 冷却总时长(秒),用于计算进度
    maxCooldown: number;
}
