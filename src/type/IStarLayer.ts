export interface StarLayer {
    // 密度控制(优先使用 count,否则按 weight 比例分配)
    // 该层固定的星星数量
    count?: number;
    // 占比权重
    weight?: number;

    radiusMin: number;
    radiusMax: number;
    // 垂直速度范围(近景快,远景慢)
    speedMin: number;
    speedMax: number;

    // 震动衰减(远景抖动更少)
    shakeFactor: number;
    // 视差系数(远景移动更少)
    parallax: number;
}