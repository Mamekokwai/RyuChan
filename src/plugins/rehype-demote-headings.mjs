// 正文 Markdown 标题整体降一级（h1→h2 … h5→h6）。
// 文章页标题已由 MainCard 渲染为唯一的 <h1>，正文里若再有 # 会形成多个 <h1>，
// 被 Bing/Google 标记「多个 h1」错误；降级后每页只保留一个 <h1>。
export default function rehypeDemoteHeadings() {
    const demote = (node) => {
        if (node && node.tagName) {
            const m = /^h([1-5])$/.exec(node.tagName);
            if (m) {
                node.tagName = `h${Number(m[1]) + 1}`;
            }
        }
        if (node && node.children) {
            for (const child of node.children) {
                demote(child);
            }
        }
    };

    return (tree) => {
        demote(tree);
    };
}
