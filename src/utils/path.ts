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

export async function compressUint8Array(
    data: Uint8Array<ArrayBuffer>,
    format: CompressionFormat = 'deflate-raw'
): Promise<Uint8Array<ArrayBuffer>> {
    const readable = new ReadableStream({
        start(controller) {
            controller.enqueue(data);
            controller.close();
        }
    });

    const stream = readable.pipeThrough(new CompressionStream(format));
    const compressedBuffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(compressedBuffer);
}

export async function decompressBlob(
    data: Uint8Array<ArrayBuffer>,
    format: CompressionFormat = 'deflate-raw'
): Promise<Uint8Array<ArrayBuffer>> {
    const readable = new ReadableStream({
        start(controller) {
            controller.enqueue(data);
            controller.close();
        }
    });
    const stream = readable.pipeThrough(new DecompressionStream(format));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
}