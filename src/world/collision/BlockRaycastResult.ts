export interface BlockRaycastResult {
    hit: boolean;
    t: number; // 碰撞发生的时间比例 (0.0 ~ 1.0)
    gridX: number; // 撞到的格子 X 坐标
    gridY: number; // 撞到的格子 Y 坐标
    normalX: number; // 碰撞法线 X (1 或 -1)
    normalY: number; // 碰撞法线 Y (1 或 -1)
}