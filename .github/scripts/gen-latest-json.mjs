#!/usr/bin/env node
/**
 * 生成 Tauri updater 使用的 latest.json 清单.
 *
 * 说明:
 *   - version 与 src-tauri/tauri.conf.json 中的 version 必须一致, 客户端据此判断是否需要更新.
 *   - signature 为 `*.msi.sig` 文件内容(base64), 由 `tauri build` 在已配置签名私钥时自动生成.
 *   - --target / --signature-file / --url 为一组, 可重复出现, 便于后续扩展到 macOS / Linux 产物.
 *
 * 用法:
 *   node .github/scripts/gen-latest-json.mjs \
 *     --version 0.2.17 \
 *     --notes-file release-notes.md \
 *     --out latest.json \
 *     --target windows-x86_64 \
 *     --signature-file src-tauri/target/release/bundle/msi/nova-flight_0.2.17_x64_zh-CN.msi.sig \
 *     --url https://arctic-red-tide.xyz/app/nova-flight/nova-flight_0.2.17_x64_zh-CN.msi
 *
 * 可选参数:
 *   --notes <文本>      直接指定更新说明(默认读取 --notes-file, 二者缺省为空字符串)
 *   --pub-date <时间>   RFC3339 时间, 缺省为当前 UTC 时间
 */

import {readFileSync, writeFileSync} from 'node:fs';

/** semver(允许预发布/构建后缀) */
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
/** latest.json 中 platform 键的合法取值形式, 例如 windows-x86_64 / darwin-aarch64 */
const TARGET_PATTERN = /^[a-z0-9]+-[a-z0-9_]+$/;

const options = {platforms: []};
const argv = process.argv.slice(2);

/** 打印错误并中断 */
function fail(message) {
    console.error(`[gen-latest-json] 错误: ${message}`);
    process.exit(1);
}

/** 取最近一次 --target 建立的平台条目 */
function currentPlatform() {
    const platform = options.platforms.at(-1);
    if (!platform) fail('--signature-file / --url 必须紧跟在 --target 之后');
    return platform;
}

for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (value === undefined) fail(`参数 ${key} 缺少取值`);

    switch (key) {
        case '--version':
            options.version = value;
            break;
        case '--notes':
            options.notes = value;
            break;
        case '--notes-file':
            options.notes = readFileSync(value, 'utf8').trim();
            break;
        case '--out':
            options.out = value;
            break;
        case '--pub-date':
            options.pubDate = value;
            break;
        case '--target':
            options.platforms.push({target: value});
            break;
        case '--signature-file':
            currentPlatform().signature = readFileSync(value, 'utf8').trim();
            break;
        case '--signature':
            currentPlatform().signature = value.trim();
            break;
        case '--url':
            currentPlatform().url = value;
            break;
        default:
            fail(`未知参数 ${key}`);
    }
}

if (!options.version || !SEMVER_PATTERN.test(options.version)) fail('--version 必须是合法版本号, 例如 0.2.17');
if (!options.out) fail('缺少 --out');
if (options.platforms.length === 0) fail('至少需要一组 --target / --signature-file / --url');

for (const platform of options.platforms) {
    if (!TARGET_PATTERN.test(platform.target)) fail(`--target 取值非法: ${platform.target}`);
    if (!platform.signature) fail(`${platform.target} 缺少签名内容(--signature-file 或 --signature)`);
    if (!/^https:\/\/\S+$/.test(platform.url ?? '')) fail(`${platform.target} 的 --url 必须是 https 链接`);
}

const manifest = {
    version: options.version,
    notes: options.notes ?? '',
    // Tauri 期望 RFC3339, 去掉毫秒以获得更干净的时间戳
    pub_date: options.pubDate ?? new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    platforms: Object.fromEntries(
        options.platforms.map((platform) => [
            platform.target,
            {signature: platform.signature, url: platform.url},
        ]),
    ),
};

writeFileSync(options.out, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`[gen-latest-json] 已生成 ${options.out} (version=${manifest.version}, platforms=${Object.keys(manifest.platforms).join(', ')})`);
