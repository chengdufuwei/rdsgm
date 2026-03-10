# rdsgm static site

这是一个纯静态站点项目，目标是替代旧的镜像式页面，改为“栏目页 + 静态新闻 + 静态分页”的结构，便于搜索引擎持续发现新内容。

## 目录
- `src/data/site.json`：站点名称、域名、联系方式、栏目内容。
- `src/data/news.json`：新闻数据源。每新增一篇新闻，就新增一个对象。
- `src/assets/styles.css`：整站样式。
- `scripts/build.js`：静态构建脚本。
- `dist/`：构建后的发布目录，直接上传到静态空间即可。

## 发布新闻
1. 修改 `src/data/news.json`，新增一条新闻。
2. 保证 `slug` 唯一，`date` 使用 `YYYY-MM-DD`。
3. `title`、`summary`、`content` 都要写成原创文本，不要再复制旧站镜像内容。
4. 运行 `npm run build`。
5. 把 `dist/` 里的文件同步到服务器。

## 域名设置
上线前先把 `src/data/site.json` 里的 `domain` 改成正式域名，例如：

```json
{
  "domain": "https://www.your-domain.com"
}
```

如果不改，`canonical`、`sitemap.xml`、`feed.xml` 和结构化数据都会继续使用占位域名。

## 搜索引擎收录建议
- 每次新增新闻后都重新构建并上传全站。
- 在百度站长平台、必应站长工具里主动提交 `sitemap.xml`。
- 新闻标题保持清晰，避免堆词。
- 详情页正文至少写 3 段以上，保持原创。
- 栏目页和新闻页要持续互相内链，不要只发列表不发详情。

## 当前输出
构建会生成：
- 栏目页
- 新闻详情页
- 新闻分页列表
- `robots.txt`
- `sitemap.xml`
- `feed.xml`
- `404.html`
- 基础结构化数据（Organization / WebSite / WebPage / BreadcrumbList / NewsArticle）
