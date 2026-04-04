export interface TextureProvider {
    getTexture(key: string): ImageBitmap;

    getCovered(key: string): string;
}