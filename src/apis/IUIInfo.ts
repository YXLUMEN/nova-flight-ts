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

export interface UIOptions<W = any> {
    // 从具体 Weapon 提取 UI 信息，返回 null 则不渲染该武器
    getWeaponUI?: (weapon: W, key: string) => WeaponUIInfo | null;
    // "14px/1.2 Inter, sans-serif"
    font?: string;
    // 文字颜色
    hudColor?: string;
}