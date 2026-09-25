const GuiFontFamily = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

const GuiMonoFamily = "'Cascadia Code', Consolas, 'Courier New', monospace";


function guiFont(size: number, weight: string | number = 400, family: string = GuiFontFamily): string {
    return `${weight} ${Math.round(size)}px ${family}`;
}

/** 估算给定字号的行高 */
function guiLineHeight(size: number): number {
    return Math.ceil(size * 1.4);
}

const GuiColors = Object.freeze({
    /** 纯屏背景(不透明界面默认底色) */
    screen: "#04070d",
    /** 主文字 */
    text: "#f0f6ff",
    /** 次要文字 */
    textMuted: "#93a5bd",
    /** 强调色 / 焦点 */
    accent: "#5ec8ff",
    /** 成功 / HUD 类信息 */
    success: "#00ff99",
    /** 危险 / 错误 */
    danger: "#ff5c5c",
    /** 面板底 */
    surface: "rgba(14,22,34,0.92)",
    /** 描边 */
    border: "rgba(150,180,220,0.24)",
    /** 轨道 / 空槽 */
    track: "rgba(255,255,255,0.12)",
    /** 悬停高亮 */
    hover: "rgba(94,200,255,0.16)",
    /** 按下变暗 */
    press: "rgba(0,0,0,0.30)",
    /** 遮罩层 */
    overlay: "rgba(0,0,0,0.6)",
    /** 光标 / 插入符 */
    caret: "#ffffff",
});

export const GuiTheme = Object.freeze({
    font: guiFont,
    lineHeight: guiLineHeight,
    defaultFont: guiFont(14),
    fontFamily: GuiFontFamily,
    monoFamily: GuiMonoFamily,
    colors: GuiColors,
    /** 小控件圆角 */
    radius: 6,
    /** 面板圆角 */
    radiusPanel: 10,
    /** 标准控件高度 */
    controlHeight: 34,
    /** 容器内边距 */
    spacing: 10,
    /** 流式布局子项间距 */
    gap: 8,
});
