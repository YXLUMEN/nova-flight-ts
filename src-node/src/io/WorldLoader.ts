import {access, mkdir, readFile, rename, rm, unlink, writeFile} from "fs/promises";
import {join} from "path";
import type {UUID} from "../../../src/apis/types.ts";
import {NbtCompound} from "../../../src/nbt/NbtCompound.ts";
import type {ServerPlayerEntity} from "../../../src/server/entity/ServerPlayerEntity.ts";
import {Result} from "../../../src/utils/result/Result.ts";

export class WorldLoader {
    public static readonly SAVES_DIR = join(process.cwd(), "saves");

    private static async ensureDir(worldName: string): Promise<void> {
        const worldDir = this.getWorldDir(worldName);
        const playerDir = this.getPlayerDataDir(worldName);
        await mkdir(worldDir, {recursive: true});
        await mkdir(playerDir, {recursive: true});
    }

    private static getWorldDir(worldName: string): string {
        return join(this.SAVES_DIR, worldName);
    }

    private static getWorldFilePath(worldName: string): string {
        return join(this.getWorldDir(worldName), 'world.dat');
    }

    private static getPlayerDataDir(worldName: string): string {
        return join(this.getWorldDir(worldName), 'player_data');
    }

    private static getPlayerFilePath(worldName: string, uuid: UUID): string {
        return join(this.getPlayerDataDir(worldName), `${uuid}.dat`);
    }

    public static async saveWorld(saveName: string, compound: NbtCompound): Promise<void> {
        await this.ensureDir(saveName);
        const filePath = this.getWorldFilePath(saveName);
        const data = compound.toRootBinary();

        const temp = `${filePath}.tmp`;
        await writeFile(temp, data);
        await rename(temp, filePath);
    }

    public static async savePlayer(player: ServerPlayerEntity): Promise<void> {
        const saveName = this.getSaveName(player);
        if (!saveName) return;

        await this.ensureDir(saveName);
        const filePath = this.getPlayerFilePath(saveName, player.getUUID());

        const nbt = new NbtCompound();
        player.writeNBT(nbt);

        const data = nbt.toRootBinary();

        const temp = `${filePath}.tmp`;
        await writeFile(temp, data);
        await rename(temp, filePath);
    }

    public static async loadWorld(worldName: string): Promise<NbtCompound | null> {
        const filePath = this.getWorldFilePath(worldName);

        let raw: Buffer;
        try {
            raw = await readFile(filePath);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
            throw e;
        }

        return NbtCompound.fromRootBinary(raw);
    }

    public static async loadPlayer(player: ServerPlayerEntity): Promise<NbtCompound | null> {
        const saveName = this.getSaveName(player);
        if (!saveName) return null;

        const uuid: UUID = player.getProfile().clientId;
        const filePath = this.getPlayerFilePath(saveName, uuid);

        let raw: Buffer;
        try {
            raw = await readFile(filePath);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
            throw e;
        }
        return NbtCompound.fromRootBinary(raw);
    }

    public static async deleteWorld(saveName: string): Promise<Result<boolean, Error>> {
        try {
            const worldDir = this.getWorldDir(saveName);
            try {
                await access(worldDir);
            } catch {
                return Result.ok(false);
            }

            await rm(worldDir, {recursive: true, force: true});
            return Result.ok(true);
        } catch (error) {
            return Result.err(error instanceof Error ? error : new Error(String(error)));
        }
    }

    public static async deletePlayerData(player: ServerPlayerEntity): Promise<boolean> {
        const saveName = this.getSaveName(player);
        if (!saveName) return false;

        const uuid: UUID = player.getProfile().clientId;
        const filePath = this.getPlayerFilePath(saveName, uuid);

        try {
            await access(filePath);
            await unlink(filePath);
            return true;
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === 'ENOENT') console.warn('');
            return false;
        }
    }

    private static getSaveName(player: ServerPlayerEntity): string | null {
        const server = player.getWorld().getServer();
        if (!server) return null;
        const profile = server.profile;
        if (!profile) return null;
        return profile.name;
    }
}