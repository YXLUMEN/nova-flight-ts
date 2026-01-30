import {Result} from "./result/Result.ts";

export class OPFS {
    private static root: FileSystemDirectoryHandle | null = null;

    public static async initRoot(): Promise<Result<FileSystemDirectoryHandle, Error>> {
        if (this.root !== null) return Result.ok(this.root);

        try {
            const root = await navigator.storage.getDirectory();
            this.root = root;
            return Result.ok(root);
        } catch (err) {
            return Result.err(this.mapErr(err, 'Unable to get root directory'));
        }
    }

    public static async resolveParent(path: string): Promise<Result<FileSystemDirectoryHandle, Error>> {
        const result = await this.initRoot();
        if (result.isErr()) return Result.err(result.unwrapErr());
        const root = result.ok().get();

        const parts = path
            .replace(/\\/g, '/')
            .split('/')
            .filter(part => part !== '');

        if (parts.length === 0) {
            return Result.err(Error('Invalid empty path'));
        }

        const parentParts = parts.slice(0, -1);

        let current = root;
        for (const part of parentParts) {
            current = await current.getDirectoryHandle(part);
        }

        return Result.ok(current);
    }

    public static async mkdir(path: string): Promise<Result<void, Error>> {
        const result = await this.initRoot();
        if (result.isErr()) return Result.err(result.unwrapErr());
        const root = result.ok().get();

        try {
            const parts = path
                .replace(/\\/g, '/')
                .split('/')
                .filter(part => part.length > 0);

            if (parts.length === 0) {
                return Result.ok(undefined);
            }

            let currentDir = root;
            for (const part of parts) {
                currentDir = await currentDir.getDirectoryHandle(part, {create: true});
            }
        } catch (error) {
            return Result.err(this.mapErr(error, `Unable to create directory: ${path}`));
        }

        return Result.ok(undefined);
    }

    public static async writeFile(filename: string, buffer: FileSystemWriteChunkType): Promise<Result<void, Error>> {
        const result = await this.initRoot();
        if (result.isErr()) return Result.err(result.unwrapErr());
        const root = result.ok().get();

        let writable: FileSystemWritableFileStream | null = null;
        try {
            const fileHandle = await root.getFileHandle(filename, {create: true});

            writable = await fileHandle.createWritable();
            await writable.write(buffer);
        } catch (error) {
            return Result.err(this.mapErr(error, `Unable to write file: ${filename}`));
        } finally {
            try {
                await writable?.close();
            } catch {
                console.warn('Cannot close write handler');
            }
        }

        return Result.ok(undefined);
    }

    public static async readFile(filename: string): Promise<Result<ArrayBuffer, Error>> {
        const result = await this.initRoot();
        if (result.isErr()) return Result.err(result.unwrapErr());
        const root = result.ok().get();

        try {
            const fileHandle = await root.getFileHandle(filename);
            const file = await fileHandle.getFile();
            const arrayBuffer = await file.arrayBuffer();
            return Result.ok(arrayBuffer);
        } catch (error) {
            return Result.err(this.mapErr(error, `Unable to read file: ${filename}`));
        }
    }

    public static async unlink(path: string, recursive: boolean = false): Promise<Result<void, Error>> {
        const result = await this.resolveParent(path);
        if (result.isErr()) return Result.err(result.unwrapErr());
        const parent = result.ok().get();

        try {
            await parent.removeEntry(path, {recursive});
        } catch (error) {
            return Result.err(this.mapErr(error, `Unable to remove file: ${path}`));
        }
        return Result.ok(undefined);
    }

    public static async rename(oldPath: string, newPath: string): Promise<Result<void, Error>> {
        const result = await this.initRoot();
        if (result.isErr()) return Result.err(result.unwrapErr());
        const root = result.ok().get();

        try {
            const fileHandle = await root.getFileHandle(oldPath);
            const file = await fileHandle.getFile();
            const buffer = await file.arrayBuffer();

            const writeResult = await this.writeFile(newPath, buffer);
            if (writeResult.isErr()) return Result.err(result.unwrapErr());

            const unlinkResult = await this.unlink(oldPath);
            if (unlinkResult.isErr()) return Result.err(result.unwrapErr());
        } catch (error) {
            return Result.err(this.mapErr(error, `Unable to rename file from ${oldPath} to ${newPath}`));
        }

        return Result.ok(undefined);
    }

    private static mapErr(error: unknown, customMessage: string) {
        if (error instanceof Error) {
            return error;
        }
        return new Error(customMessage, {cause: error});
    }
}