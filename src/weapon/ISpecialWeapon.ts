export interface ISpecialWeapon {
    bindKey(): string;
}

export function isSpecialWeapon(weapon: unknown): weapon is ISpecialWeapon {
    return typeof weapon === 'object'
        && weapon !== null
        && typeof (weapon as ISpecialWeapon).bindKey === 'function';
}