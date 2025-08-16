export interface IBaseWeapon {
    getFireRate(): number;
}

export function isBaseWeapon(weapon: unknown): weapon is IBaseWeapon {
    return typeof weapon === 'object'
        && weapon !== null
        && typeof (weapon as IBaseWeapon).getFireRate === 'function';
}
