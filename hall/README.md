# Vibe Hall 公共成就榜

此服务接收 MyOffice 用户主动提交的成就资料。仓库包含服务代码，不包含已部署的公共实例。它使用 Node.js 22.13+ 内置的 `node:http` 与 `node:sqlite`，并将记录写入持久 SQLite 数据库。

## 公开资料与隐私

在用户配置 HTTPS Hall、查看发布预览并明确同意后，MyOffice 提交以下资料：公开昵称、已获得徽章 ID、由徽章计算出的积分，以及六项汇总统计：

- `tokens`：Codex Token Dashboard 最近 30 天汇总，按 Asia/Shanghai 日界线统计
- `projects`：同一收集器窗口内出现的 Codex 项目数量
- `sessions`：最近 30 个 UTC 日内观察到的主会话数量
- `activeDays`：有会话活动的 UTC 日数量
- `streak`：这 30 个 UTC 日内最长连续活跃天数
- `agents`：出现过的 Agent 类型数量

这些统计会保存在数据库中，并由公开榜单 API 返回；用户可按统计维度查看排名。Token 和项目数依赖可选 Codex Token Dashboard 收集器，收集器不可用时对应值会是 `null`，不会当作零参与该维度排名。其他统计来自 MyOffice 本机观察到的会话。公开榜单是用户自报资料，不是经核验的使用记录。

服务不要求真实姓名或联系信息，不接收提示词、会话文本、项目路径、源码或会话 ID。MyOffice 只发送汇总统计，不发送底层会话记录。服务保存随机撤回凭据的 SHA-256 哈希，不保存凭据本身。MyOffice 本地的 `~/.whatsmyagentdoing/achievements-v1.json` 会保存撤回所需的随机撤回凭据；请留在本机。每次发布或更新都需重新预览并勾选同意。可通过 MyOffice 撤回，撤回会立即移除公开条目。

没有设置 Hall 地址时，成就只保存在本机，榜单离线。未配置的本地连接不会发布资料。连接地址可通过 `MYOFFICE_HALL_URL` 指定，或写在 `~/.whatsmyagentdoing/hall-config.json`：

```json
{"origin":"https://hall.example.com"}
```

只接受 HTTPS 公共地址。明确配置的 loopback HTTP 地址仅供本机预览，MyOffice 会禁用发布。仓库没有部署公网服务或提供线上用户榜单。

## 本机运行

需要 Node.js 22.13 或更新版本。Dashboard 本体仍可在 Node.js 18+ 运行；只有 Hall 服务需要较新的内置 SQLite 支持。从仓库根目录启动：

```sh
DB_PATH=./data/hall.sqlite HOST=127.0.0.1 PORT=8787 node hall/server.js
```

服务默认只绑定 `127.0.0.1`。`data/` 目录会以尽可能严格的权限创建。请使用持久磁盘，并保护数据库备份。

## Docker

从仓库根目录构建，以包含共用的徽章协议文件：

```sh
docker build -f hall/Dockerfile -t myoffice-vibe-hall .
docker run --rm --name myoffice-vibe-hall \
  -p 127.0.0.1:8787:8787 \
  -v myoffice-vibe-hall-data:/data \
  myoffice-vibe-hall
```

容器内服务监听 `0.0.0.0:8787`，示例只将端口发布到本机。公开托管时，请用可信反向代理终止 HTTPS、保留 `/data` 持久卷、限制主机或容器访问，并由托管平台配置请求频率限制与备份策略。此仓库不会部署或公开服务。

## API

- `GET /healthz` 返回 `{ "ok": true }`。
- `GET /api/v1/leaderboard?page=1` 默认按徽章积分排名，每页最多 25 项；同分使用竞赛排名，平分项的行顺序稳定。
- `GET /api/v1/leaderboard?page=1&metric=tokens` 可按 `tokens`、`projects`、`sessions`、`activeDays`、`streak` 或 `agents` 排名。缺少该统计值（`null`）的资料不进入该维度的排行。返回资料包含昵称、徽章、积分和已提交的汇总统计。
- `PUT /api/v1/entry` 创建或更新条目。请求需要 `Authorization: Bearer <64 位小写十六进制凭据>`、未来五分钟内的 `X-MyOffice-Publish-Until` 毫秒时间戳、JSON content type，并要求明确 `consent: true`。资料结构：

  ```json
  {
    "consent": true,
    "profile": {
      "alias": "Maker One",
      "badges": ["first"],
      "score": 10,
      "stats": {
        "tokens": 1000,
        "projects": 2,
        "sessions": 1,
        "activeDays": 1,
        "streak": 1,
        "agents": 1
      }
    }
  }
  ```

  `stats` 对旧客户端可省略；提供时六个字段都要出现，值为非负安全整数或 `null`。MyOffice 当前客户端会提供全部字段，并在预览和提交时展示这些公开数字。昵称、徽章 ID、积分和统计由共用的 `src/achievement-protocol.js` 校验。
- `GET /api/v1/entry` 使用凭据返回 `{ "rank", "total" }`；无条目时返回 404。
- `DELETE /api/v1/entry` 删除条目，重复撤回也返回 `{ "removed": true }`。撤回后最多五分钟内拒绝延迟到达的旧发布请求。

写请求拒绝浏览器 `Origin` 和跨站 fetch；服务不配置 CORS。请求体上限 8 KiB，默认最多 10,000 个条目。服务不记录请求或凭据日志。公开部署仍需平台侧请求频率控制和备份策略。

## 测试

从仓库根目录运行：

```sh
node --test hall/tests/hall.cjs
```

测试使用虚构账号和临时 SQLite 数据库。
