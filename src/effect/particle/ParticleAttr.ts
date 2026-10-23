/**
 * 布局约定:
 *   - 核心行: 12 槽 × 4B = 48B, 一块 ArrayBuffer + f32/u32 两个视图共用下标.
 *   - meta:   Uint16Array, 低 3 位是 shape, 其余 13 位是外挂属性 presence 位.
 *   - 外挂列: 同容量 Float32Array, 只有 meta 位被置上的槽位才有意义, 按需分配.
 */


/** 核心行槽位下标 */
export const enum P_IDX {
    CX,
    CY,
    PX,
    PY,
    VX,
    VY,
    ACC,
    SIZE,
    /** 收缩系数, 与 SIZE 在同一条 shrink 链上, 因此留在核心行 */
    REC,
    AGE,
    LIFE,
    /** 起始颜色 0xRRGGBBAA */
    C0,
    /** 结束颜色 0xRRGGBBAA */
    C1,
    /** 属性总数哨兵, **必须**始终在最后 */
    COUNT,
}

export const ROW_SLOTS = P_IDX.COUNT;

/** shape 占用的 meta 低位宽度 (最多 8 种形态) */
const SHAPE_BITS = 3;

/** shape 在 meta 中的掩码 */
export const SHAPE_MASK = (1 << SHAPE_BITS) - 1;

/** 外挂属性位在 meta 中的起始位置 */
export const ATTR_SHIFT = SHAPE_BITS;

/**
 * 外挂属性. 最多 13 种
 *
 * 只允许在末尾追加, 不允许重排或删除: 编号决定 meta 位, 而位是随粒子存活的,
 * 改动会让运行中的池子错位.
 *
 * 两类属性:
 *   - 值型 (attach): 有一列 Float32Array 存参数, 如 ROT / DRAG.
 *   - 标记型 (tag): 只有 presence 位, 没有数据列, 如 GRAVITY.
 */
export const enum ParticleAttr {
    ROT,
    GRAVITY,
    COLLIDE,
    /** 属性总数哨兵, **必须**始终在最后 */
    COUNT,
}

export const ATTR_COUNT = ParticleAttr.COUNT;

export function attrBit(attr: ParticleAttr): number {
    return 1 << (ATTR_SHIFT + attr);
}

export const BIT_ROT = attrBit(ParticleAttr.ROT);
