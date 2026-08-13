// 把 pagefind 生成的索引从 dist 复制到 public，供 dev 服务器与提交使用。
// 用 Node 内置 fs 而非 shell glob，避免 Windows cmd 下单引号 glob 静默失败。
import { cpSync, existsSync, rmSync } from "node:fs";

const src = "dist/pagefind";
const dest = "public/pagefind";

if (!existsSync(src)) {
    console.error(`[copy-pagefind] 未找到 ${src}，请先运行 pagefind --site dist`);
    process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });

console.log(`[copy-pagefind] 已复制 ${src} → ${dest}`);
