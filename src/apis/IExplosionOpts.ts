export type ExplosionOpts = {
    radius?: number;        // 视觉半径
    ring?: boolean;
    smoke?: boolean;
    screenFlash?: boolean;
    // 摄像机震动强度
    shake?: number;
    // 火花数量
    sparks?: number;
    fastSparks?: number,
    damage?: number;        // AoE 伤害
};