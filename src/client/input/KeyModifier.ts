export const enum KeyModifier {
    NONE = 0,
    CTRL = 1 << 0,
    SHIFT = 1 << 1,
    ALT = 1 << 2,
    META = 1 << 3
}

export function fromEvent(event: KeyboardEvent | MouseEvent): number {
    return (event.ctrlKey ? KeyModifier.CTRL : 0) |
        (event.shiftKey ? KeyModifier.SHIFT : 0) |
        (event.altKey ? KeyModifier.ALT : 0) |
        (event.metaKey ? KeyModifier.META : 0);
}