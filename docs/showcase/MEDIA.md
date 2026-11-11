# MyOffice 演示媒体说明

本次媒体用于 `myoffice-v0.8.1-r1`，展示真实浏览器中的现有功能操作。

## 视频与时间点

- `myoffice-demo.mp4`：41.9 秒，H.264，1280 × 800，20 fps 导出，无音轨。完整文件作为 GitHub Release 附件发布。
- `myoffice-demo.gif`：同一视频的 960 × 600、8 fps 循环预览，提交到仓库供 README 显示。
- 页面录制区域为 1280 × 720；底部另加 80 px 说明区，不遮挡页面操作。
- 原始连续录制获得 658 帧，按实际时间戳重建时间线。没有重绘界面、伪造按钮或生成假交互。

| 时间 | 真实操作 |
|---|---|
| 00:00–00:03 | 原版办公室里的演示 Agent |
| 00:03–00:09 | 技能分类书桌、开发类书本 |
| 00:09–00:19 | 拖书到阅读垫，打开技能并翻到下一章 |
| 00:19–00:25 | 公共技能目录及开发分类 |
| 00:25–00:30 | 七座奖杯与悬浮名称提示 |
| 00:30–00:39 | Token 排行公告板、项目排行、展开徽章 |
| 00:39–00:42 | 返回成就办公室 |

## 数据与来源

`node scripts/demo-showcase.cjs` 启动隔离的本地演示服务。它使用上游 `DemoWatcher` 的虚构会话、临时目录中的十个虚构技能，以及明确标注的离线示例榜。公共技能目录直接使用仓库内的静态 metadata 快照。演示不扫描真实会话或个人技能目录，不启动 Codex 收集器或社交工作台，也不提交公开资料。

办公室及奖杯画风继承上游 MIT 项目；3D 模型的 Kenney CC0 归属说明保留在上游文档。视频没有配乐或旁白。字幕为文本排版，不包含重新生成的界面画面，也没有分发字体文件。

## 截图

截图由同一次浏览器录制的实际帧转为 PNG，未替换 UI 内容：

| 文件 | 视频时间（秒） |
|---|---|
| `office.png` | 1.20 |
| `library-desks.png` | 4.18 |
| `library-books.png` | 8.00 |
| `skill-reader.png` | 15.92 |
| `public-library.png` | 20.68 |
| `trophy-office.png` | 27.52 |
| `leaderboard.png` | 32.14 |

## 验证范围

视频已完整解码检查；发布检查按两秒间隔抽帧、关键操作画面和原始操作状态记录复核。媒体审查是抽帧复核，不声称以正常速度主观观看过每一帧。无音轨，无试听或口播验收事项。

后端回归检查覆盖六个测试文件，共 29 项通过：

```sh
node --test tests/achievements.cjs tests/codex-usage.cjs tests/library.cjs tests/workflow-canvas.cjs tests/server.cjs hall/tests/hall.cjs
```

该记录不代表全部客户端或浏览器端到端测试。公网 Hall 未部署；演示中的榜单为示例数据。

## 文件摘要

SHA-256：

- `leaderboard.png`：`3e7b67a66fcbd0e36542eb692bc93d576907c06e4af73626ac2563169cca2c1a`
- `library-books.png`：`5838a573ec5e6330fa47cfba9fecb06b5ab2888f5776335240b14fc689fef1cc`
- `library-desks.png`：`dae7e33f26e1bf31e44f2dc7ae5b48469ebca239a0018c122cebcdeab29a8fb9`
- `myoffice-demo.gif`：`446760e6c20eb1fa56573ebf6a6eb5088eaae3717986a6939e6a2cfb448405c4`
- `myoffice-demo.mp4`：`09e763a65590408763e196ec40e6461fbda3a987435e6192c38fc8fc7ca70985`
- `office.png`：`aae74bde6aaac53fdb069ad15b4576cf48ec3a7e09de9e528e83ee6529c220df`
- `public-library.png`：`e5f103fe499efcabf9e78b96137ac5cd910598b617d1a32e968db1521acdb3f9`
- `skill-reader.png`：`9439223344eec0a6222c767a41e334080b0da08b0e48af7014847a61d351c180`
- `trophy-office.png`：`17b178b5cd9800020f55fc8fb566f06a8020d8991815e43fca1d9e2997f18dc0`
