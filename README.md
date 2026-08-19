<div align="center">

# 🎮 Game Schedule · 游戏活动日历

**实时追踪 6 款热门游戏的活动时间线** — 原神 · 星穹铁道 · 绝区零 · 鸣潮 · 明日方舟 · 终末地

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

</div>

---

## ✨ 功能特性

- **自动抓取** — 每天 05:00 / 12:00 定时抓取 6 款游戏的活动数据，也可手动刷新
- **双视图** — 分组视图（进行中 / 即将开始 / 已结束）与全局时间线视图一键切换
- **紧急提醒** — 3 天内截止的活动置顶显示，红色 🔥 urgent 条一目了然
- **进度追踪** — 进行中活动显示剩余天数与进度条
- **详情弹窗** — 点击卡片查看活动横幅、时间范围与官方公告链接
- **游戏筛选** — 按游戏过滤，3 个以上活动自动折叠
- **暗色模式** — 一键切换，偏好自动保存
- **图片缓存** — 所有活动横幅缓存到服务器本地，加速加载
- **移动端适配** — 触控友好，响应式布局

## 🖼️ 界面预览

> 截图待补充 — 部署后访问 `http://<host>:2666` 查看

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Node.js · Express · TypeScript |
| 前端 | 原生 JavaScript · CSS（无框架） |
| 数据 | JSON 文件存储（`data/events.json` + 图片缓存） |
| 部署 | Docker · docker-compose |

## 🚀 快速开始

### Docker 部署（推荐）

```bash
git clone https://github.com/jacket-sikaha/game-schedule.git
cd game-schedule
docker compose up -d --build
```

访问 `http://localhost:2666`。

> **注意**：绝区零与终末地数据源需要代理访问，请在 `docker-compose.yml` 中配置 `HTTP_PROXY` / `HTTPS_PROXY` 环境变量。

### 本地开发

```bash
cd backend
npm install
npm run dev        # 开发模式（tsx watch）
npm run build      # 编译 TypeScript
npm start          # 运行编译产物
```

默认端口 `2444`，可通过 `PORT` 环境变量修改。

## 📡 API 文档

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/events` | 全部活动（扁平数组） |
| GET | `/api/events/:gameId` | 指定游戏的活动 |
| POST | `/api/refresh` | 手动触发全量抓取 |
| GET | `/api/status` | 抓取状态与各游戏事件数 |
| GET | `/api/games` | 游戏注册表（id/名称/图标/颜色） |
| GET | `/api/about` | 项目说明（README） |
| GET | `/api/health` | 健康检查 |
| GET | `/i/:filename` | 缓存的横幅图片 |

响应统一格式：`{ "code": 200, "data": ... }`

## 🎯 数据源

| 游戏 | 数据来源 |
|---|---|
| 原神 | 米游社 API |
| 星穹铁道 | 米游社 API |
| 绝区零 | HoYoLAB 社区 API |
| 鸣潮 | 库街区 API |
| 明日方舟 | 鹰角网络 API |
| 终末地 | 官网公告 + Endfield Talos Wiki |

## 📁 项目结构

```
game-schedule/
├── backend/               # Express + TypeScript 后端
│   └── src/
│       ├── games/         # 各游戏数据源适配器
│       ├── fetcher.ts     # 抓取编排（并发 + 容错）
│       ├── scheduler.ts   # 定时任务（05:00 / 12:00）
│       ├── image-cache.ts # 横幅图片缓存
│       └── store.ts       # JSON 存储
├── frontend/              # 原生 JS 单页应用
│   ├── index.html
│   ├── app.js
│   └── style.css
├── data/                  # 运行时数据（events.json + images/）
├── Dockerfile
└── docker-compose.yml
```

## 🗺️ 路线图

- [ ] 推送通知（活动即将结束提醒）
- [ ] iCal 导出（活动加入日历）
- [ ] 多语言支持
- [ ] 更多游戏数据源

## 📄 License

[MIT](LICENSE)
