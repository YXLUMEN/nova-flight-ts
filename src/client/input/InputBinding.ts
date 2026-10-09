import {SettingItem} from "../settings/SettingItem.ts";
import type {InputStroke} from "./InputStroke.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import type {TranslatableText} from "../../i18n/TranslatableText.ts";

export class InputBinding extends SettingItem<readonly InputStroke[]> {
    public static readonly KEY_REG = /^(?:Key[A-Z]|Digit[0-9]|Numpad(?:[0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter)|F(?:[1-9]|1[0-2])|Arrow(?:Up|Down|Left|Right)|Space|Escape|Tab|Enter|Backspace|Delete|Insert|Home|End|PageUp|PageDown|CapsLock|NumLock|ScrollLock|PrintScreen|Pause|ContextMenu|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Intl(?:Backslash|Ro)|Shift(?:Left|Right)|Control(?:Left|Right)|Alt(?:Left|Right)|Meta(?:Left|Right)|OS(?:Left|Right)|Mouse[0-4])$/;

    public readonly group: string;

    public constructor(
        id: Identifier,
        name: TranslatableText,
        scope: string,
        defaults: InputStroke[],
    ) {
        super(id, name, defaults, InputBinding.validate);
        this.group = scope;
    }

    private static validate(strokes: readonly InputStroke[]): boolean {
        return strokes.every(InputBinding.validStroke);
    }

    private static validStroke(strokes: InputStroke): boolean {
        const modifiers = strokes.modifiers;
        if (typeof modifiers === 'number') {
            if (!Number.isInteger(modifiers) || modifiers < 0) return false;
            // KeyModifier 的标志位总和
            return (modifiers & 15) === modifiers;
        }

        const code = strokes.code;
        // 不包括 Slash
        return typeof code === 'string' && InputBinding.KEY_REG.test(code);
    }
}