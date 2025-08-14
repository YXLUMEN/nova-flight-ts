export interface StarLayer {
    // 密度控制(优先使用 count,否则按 weight 比例分配)
    count?: number;     // 该层固定的星星数量
    weight?: number;    // 占比权重

    alpha: number;      // 暂不生效
    radiusMin: number;
    radiusMax: number;
    speedMin: number;   // 垂直速度范围(近景快,远景慢)
    speedMax: number;

    shakeFactor: number;// 震动衰减(远景抖动更少)
    parallax: number;   // 视差系数(远景移动更少)
}