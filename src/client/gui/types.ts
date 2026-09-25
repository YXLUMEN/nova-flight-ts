import type {TranslatableText} from "../../i18n/TranslatableText.ts";

/**
 * GUI 通用类型定义。
 * 文本内容可以是普通字符串,也可以是可翻译文本(与项目 i18n 体系保持一致)。
 */

/** 控件可显示的文本内容 */
export type GuiText = string | TranslatableText;

/** 对齐方式(与画布无关的抽象,绘制时再转换为 textAlign) */
export type GuiAlign = "start" | "center" | "end";

/** 容器流式布局方向 */
export type GuiFlow = "row" | "column" | null;

/** 按钮视觉变体 */
export type GuiButtonVariant = "normal" | "primary" | "danger" | "ghost";

/** 复选框外观 */
export type GuiCheckboxKind = "box" | "switch";

/** 鼠标按键(与 DOM MouseEvent.button 一致) */
export const enum GuiMouseButton {
    LEFT,
    MIDDLE,
    RIGHT,
}

export function textOf(value: GuiText): string {
    return typeof value === "string" ? value : value.toString();
}
