export interface InputStroke {
    readonly code: string;
    readonly modifiers: number | undefined;
}

const MOUSE_BUTTON = ['Mouse0', 'Mouse1', 'Mouse2', 'Mouse3', 'Mouse4'] as const;

export function strokeKey(code: string, modifiers?: number): InputStroke {
    return {code, modifiers};
}

export function mapMouse(button: number) {
    return MOUSE_BUTTON[button];
}