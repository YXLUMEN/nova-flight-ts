#!/usr/bin/env node
/**
 * 写入 src-tauri/tauri.conf.json 的版本号.
 *
 * 说明:
 *   - tauri.conf.json 的 version 是唯一版本来源: Tauri 打包后客户端读到的版本、updater 判断
 *     是否需要更新, 都用这个值.
 *   - package.json 的 version 只是 npm 元数据, 打包产物中并不携带, 因此这里不再同步,
 *     两者不一致不会影响发布与更新.
 *   - src-tauri/Cargo.toml 的 version 同样被 tauri.conf.json 覆盖, 不参与打包.
 *   - 采用定点正则替换, 只改动版本值, 保留原文件的缩进与 CRLF 换行符.
 *
 * 用法:
 *   node .github/scripts/set-version.mjs 0.2.17 [--dry-run]
 */

import {readFileSync, writeFileSync} from 'node:fs';

/** semver(允许预发布/构建后缀) */
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
/** 顶层 version 字段: 恰好两个空格缩进, 从而避开 dependencies 中的同名字段 */
const VERSION_FIELD_PATTERN = /^( {2}"version": ")[^"]*(")/m;
const TARGET_FILE = 'src-tauri/tauri.conf.json';

const version = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

/** 打印错误并中断 */
function fail(message) {
    console.error(`[set-version] 错误: ${message}`);
    process.exit(1);
}

if (!version || !SEMVER_PATTERN.test(version)) fail('用法: node .github/scripts/set-version.mjs <版本号> [--dry-run]');

const source = readFileSync(TARGET_FILE, 'utf8');
const matched = source.match(/^ {2}"version": "[^"]*",?$/gm) ?? [];
if (matched.length !== 1) fail(`${TARGET_FILE} 中未找到唯一的顶层 version 字段(匹配到 ${matched.length} 处)`);

const updated = source.replace(VERSION_FIELD_PATTERN, `$1${version}$2`);
if (updated === source) {
    console.log(`[set-version] ${TARGET_FILE} 已是 ${version}, 无需修改`);
    process.exit(0);
}

if (!dryRun) writeFileSync(TARGET_FILE, updated, 'utf8');
console.log(`[set-version] ${dryRun ? '[dry-run] ' : ''}${TARGET_FILE}: ${matched[0].trim()} -> "version": "${version}"`);
