import {KeyModifier} from "./KeyModifier.ts";

export interface InputStroke {
    readonly code: string;
    readonly modifiers: number;
}

const MOUSE_BUTTON = ['Mouse0', 'Mouse1', 'Mouse2', 'Mouse3', 'Mouse4'] as const;

const SELF_MODIFIER: ReadonlyMap<string, number> = new Map([
    ['ControlLeft', KeyModifier.CTRL], ['ControlRight', KeyModifier.CTRL],
    ['ShiftLeft', KeyModifier.SHIFT], ['ShiftRight', KeyModifier.SHIFT],
    ['AltLeft', KeyModifier.ALT], ['AltRight', KeyModifier.ALT],
    ['MetaLeft', KeyModifier.META], ['MetaRight', KeyModifier.META],
]);

export function strokeKey(code: string, modifiers: number = 0): InputStroke {
    return {code, modifiers: modifiers | (SELF_MODIFIER.get(code) ?? 0)};
}

export function strokeModifiersForDisplay(s: InputStroke): number {
    return s.modifiers & ~(SELF_MODIFIER.get(s.code) ?? 0);
}

export function mapMouse(button: number) {
    return MOUSE_BUTTON[button];
}

export function mapWheel(deltaY: number) {
    return deltaY > 0 ? 'WheelDown' : 'WheelUp';
}