export interface IBaseWeapon {
    fireRate: number;
}

export function isBaseWeapon(weapon: unknown): weapon is IBaseWeapon {
    return typeof weapon === 'object'
        && weapon !== null
        && typeof (weapon as IBaseWeapon).fireRate === 'number';
}

