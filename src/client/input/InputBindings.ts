import {type InputStroke, strokeKey} from "./InputStroke.ts";
import {OptionStorage} from "../settings/OptionStorage.ts";
import {Options} from "../settings/Options.ts";
import {InputBinding} from "./InputBinding.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";

// TODO 按键绑定页面;修饰键;
export class InputBindings {
    public static readonly OPTIONS = new Options(1,
        new OptionStorage('/configs', 'keybinds.json')
    );

    // 移动
    public static readonly MOVE_LEFT = this.bind('move_left', 'move',
        strokeKey('ArrowLeft'), strokeKey('KeyA')
    );
    public static readonly MOVE_RIGHT = this.bind('move_right', 'move',
        strokeKey('ArrowRight'), strokeKey('KeyD')
    );
    public static readonly MOVE_FORWARD = this.bind('move_forward', 'move',
        strokeKey('ArrowUp'), strokeKey('KeyW')
    );
    public static readonly MOVE_BACKWARD = this.bind('move_backward', 'move',
        strokeKey('ArrowDown'), strokeKey('KeyS')
    );

    // 战斗
    public static readonly FIRE = this.bind('fire', 'battle',
        strokeKey('Space'), strokeKey('Mouse0'),
    );
    public static readonly SWITCH_ITEM = this.bind('switch_item', 'battle',
        strokeKey('KeyF')
    );
    public static readonly RELOAD_AMMO = this.bind('reload_ammo', 'battle',
        strokeKey('KeyR')
    );
    public static readonly SWITCH_QUICK = this.bind('switch_quick', 'battle',
        strokeKey('Mouse1')
    );
    public static readonly QUICK_RELEASE = this.bind('quick_release', 'battle',
        strokeKey('Mouse2')
    );
    public static readonly SPECIAL_SLOT = this.bind('special_slot', 'battle',
        ...Array.from({length: 9}, (_, i) => strokeKey(`Digit${1 + i}`))
    );
    public static readonly RELEASE_DECOY = this.bind('release_decoy', 'battle',
        strokeKey('KeyX')
    );
    public static readonly AUTO_AIM = this.bind('auto_aim', 'battle',
        strokeKey('AltLeft')
    );

    public static readonly DESTROY_BLOCK = this.bind('destroy_block', 'block',
        strokeKey('KeyL')
    );
    public static readonly PLACE_BLOCK = this.bind('place_block', 'block',
        strokeKey('KeyP')
    );
    public static readonly FILL_BLOCK = this.bind('fill_block', 'block',
        strokeKey('KeyO')
    );

    // 背包与科技
    public static readonly INVENTORY_SWAP = this.bind('inventory_swap', 'inventory',
        strokeKey('ShiftLeft')
    );
    public static readonly TECH_TREE = this.bind('tech_tree', 'inventory',
        strokeKey('KeyG')
    );

    public static readonly COMMAND_BAR = this.bind('command_bar', 'misc',
        strokeKey('KeyT')
    );
    public static readonly FULLSCREEN = this.bind('full_screen', 'misc',
        strokeKey('F11')
    );

    private static bind(id: string, group: string, ...strokes: InputStroke[]) {
        const item = new InputBinding(Identifier.ofVanilla(id), TranslatableText.of(`keys.${id}`), group, strokes);
        this.OPTIONS.add(item);
        return item;
    }
}