export interface WeaponUIInfo {
    label: string;        // 展示名
    color: string;        // 进度条颜色
    cooldown: number;     // 剩余冷却（秒）
    maxCooldown: number;  // 冷却总时长（秒），用于计算进度
    order?: number;       // 可选：用于排序，默认按 Map 插入顺序
}

export interface UIOptions<W = any> {
    // 从具体 Weapon 提取 UI 信息，返回 null 则不渲染该武器
    getWeaponUI?: (weapon: W, key: string) => WeaponUIInfo | null;
    font?: string;          // "14px/1.2 Inter, sans-serif"
    hudColor?: string;      // 文字颜色
    pauseHint?: string;     // 暂停副标题
}