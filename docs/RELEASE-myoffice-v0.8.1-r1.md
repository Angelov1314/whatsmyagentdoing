# MyOffice 社区更新：myoffice-v0.8.1-r1

此 fork 基于 [Charonyuu/whatsmyagentdoing](https://github.com/Charonyuu/whatsmyagentdoing) v0.8.1，保留上游 MIT 许可。本次更新把技能、成就和工作流查看加入既有本机 Agent 办公室。

## 演示素材

主演示：`docs/showcase/myoffice-demo.gif`。静音 MP4 见 [GitHub Release 下载](https://github.com/Angelov1314/whatsmyagentdoing/releases/download/myoffice-v0.8.1-r1/myoffice-demo.mp4)。图像与视频均使用 `scripts/demo-showcase.cjs` 的合成会话和虚构技能；榜单条目也为离线示例。录制未读取真实会话、个人技能目录或私有目录。

| 章节 | 时间码 |
|---|---|
| 办公室与会话 | 00:00–00:03 |
| 技能分类桌、拖书与阅读器 | 00:03–00:19 |
| 公共技能目录 | 00:19–00:25 |
| 奖杯办公室与排行公告板 | 00:25–00:42 |

[详细时间码、数据与媒体来源](showcase/MEDIA.md)。

截图：`library-desks.png`、`library-books.png`、`trophy-office.png`、`leaderboard.png`，均位于 `docs/showcase/`。

保留的上游展示页已标注为存档；安装链接与隐私说明已更新，当前功能以本 fork README 为准。

## 更新内容

- 本机技能书库：扫描 Codex、Claude Code 和 Agent Skills 安装目录，按类别浏览、搜索和阅读；另含静态公开技能目录快照。
- 成就房间：本机记录 30 UTC 日内会话、活跃日、连续活跃天数、Agent 类型，解锁徽章和积分。
- 可选 Vibe Hall：提供独立服务代码和 HTTPS 配置流程。成就默认留在本机；每次发布需预览并重新同意。公开资料包含昵称、徽章 ID、积分，以及 Token、项目、会话、活跃日、最长连续天数和 Agent 类型六项汇总统计。Token/项目统计不可用时为 `null`，不作为零参与该维度排名。
- 工作流画布：查看 `$workflow-canvas` 技能生成的本地工作流。
- Codex 用量：筛选、图表和排行；API 费率折算仅为估算。
- Social Workbench 接入：读取独立本机工作台数据和编辑流程；不声称自动向 X 或其他平台发布。

## 已知边界

- 公共 Hall 服务未部署；本次仓库更新不会自动提供线上榜单。联网发布需自行托管 Node.js 22.13+ 服务并配置 HTTPS。Dashboard 基础运行需 Node.js 18+。
- `assets/public-skills.json` 是日期为 2026-11-10 的静态目录快照，分类参考 Vibe Atlas 2026-11-03 版本，含来源链接；它不是实时排行榜，也不是技能安装器。
- Token 与项目统计需要本机 Codex Token Dashboard：`~/Library/Application Support/Codex Token Dashboard/dashboard.py`，服务端口 `127.0.0.1:8766`。当前路径和端口固定。
- Social Workbench 需要 `~/Projects/local-dashboard/start.command`，服务端口 `127.0.0.1:8769`；当前路径和端口固定。
- 工作流查看器读取本机生成文件，不负责生成；请另行使用 `$workflow-canvas` 技能。
- “API 等价费用”是费率估算，不代表订阅、credits 或实际账单。

## 回归检查记录

以下六个 Node.js 测试文件共 29 项通过（29 passed、0 failed、0 skipped；记录耗时 612 ms）：

```sh
node --test tests/achievements.cjs tests/codex-usage.cjs tests/library.cjs tests/workflow-canvas.cjs tests/server.cjs hall/tests/hall.cjs
```

范围限于这六个测试文件；此结果不代表浏览器端到端测试或独立 QA。

## 来源与许可

保留上游项目和原作者归属、MIT 许可及 Kenney CC0 模型说明。公开目录保留技能来源链接，并注明 Vibe Atlas 分类参考。原版 README 已归档至 [README.upstream.md](../README.upstream.md)。
