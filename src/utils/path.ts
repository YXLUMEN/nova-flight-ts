export function normalizedDir(root: string, absParent: string, filename: string, namespace: string): string {
    const relativeParent = absParent.replace(root, '').replace(/^[/\\]+/, '');
    const name = pruneSuffix(filename);
    return relativeParent.length > 0 ?
        `${namespace}:${relativeParent}/${name}` :
        `${namespace}:${name}`;
}

export function pruneSuffix(filename: string): string {
    const i = filename.lastIndexOf('.');
    return i < 0 ? filename : filename.substring(0, i);
}
