export type GuiCanvasAlign = "left" | "center" | "right";
export type GuiCanvasBaseline = "top" | "middle" | "bottom" | "alphabetic";

export interface GuiTextStyle {
    font?: string;
    color?: string;
    align?: GuiCanvasAlign;
    baseline?: GuiCanvasBaseline;
}