# 仓库管理系统

一个基于 Node.js + Express + MySQL 的仓库进销存管理系统，支持商品管理、入库出库、库存查询、记录导出等功能。

## 功能特性

### 核心功能
- **商品管理**：添加商品、查看商品列表、库存预警
- **入库管理**：采购入库、退货入库、调拨入库、生产入库、其他入库
- **出库管理**：销售出库、调拨出库、报损出库、样品出库、其他出库
- **库存查询**：按商品、月份查询出入库记录
- **记录导出**：支持 CSV 和 Excel 格式导出，带格式销售出库单

### 系统特性
- **用户认证**：基于 Session 的登录/登出机制
- **自动完成**：供应商、客户、产品批号模糊搜索，支持键盘导航
- **智能表单**：重复提交防护、必填字段验证、自动计算金额
- **响应式设计**：基于 Bootstrap 5 的移动端适配界面

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js, Express |
| 数据库 | MySQL 8.0+ |
| 前端 | HTML5, Bootstrap 5, JavaScript (ES6+) |
| 依赖 | bcryptjs, express-session, mysql2, body-parser |

## 快速开始

### 环境要求
- Node.js 14+
- MySQL 8.0+

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd store
```

2. **安装依赖**
```bash
npm install
```

3. **配置数据库**
- 复制 `config/databases.example.js` 为 `config/databases.js`
- 修改数据库连接配置：
```javascript
module.exports = {
    host: 'localhost',
    user: 'your_username',
    password: 'your_password',
    database: 'warehouse'
};
```

4. **初始化数据库**
执行 `sql/store.sql` 中的 SQL 脚本创建表结构和初始数据。

5. **启动服务**
```bash
npm start
```

6. **访问系统**
打开浏览器访问 `http://localhost:3000`，默认账号：
- 用户名：`admin`
- 密码：`admin123`（首次登录后请修改）

## 项目结构

```
store/
├── config/                 # 配置文件
│   ├── databases.js        # 数据库配置
│   └── session.js          # Session 配置
├── controllers/            # 控制器
│   ├── authController.js   # 认证相关
│   ├── inventoryController.js  # 出入库管理
│   └── productController.js    # 商品管理
├── middleware/             # 中间件
│   └── auth.js             # 登录验证
├── models/                 # 数据模型
│   ├── InRecordModel.js    # 入库记录
│   ├── OutRecordModel.js   # 出库记录
│   ├── ProductModel.js     # 商品
│   └── ...
├── public/                 # 静态资源
│   ├── css/                # 样式文件
│   ├── js/                 # 前端脚本
│   │   ├── in.js           # 入库管理
│   │   ├── out.js          # 出库管理
│   │   ├── out_records.js  # 出库记录导出
│   │   └── ...
│   ├── *.html              # 页面模板
│   └── in.html             # 入库页面
├── routes/                 # 路由
│   ├── authRoutes.js
│   ├── inventoryRoutes.js
│   └── productRoutes.js
├── services/               # 业务逻辑层
│   └── InventoryService.js
├── sql/                    # 数据库脚本
│   └── store.sql
├── utils/                  # 工具函数
│   ├── dbUtils.js
│   ├── dataUtils.js
│   └── logger.js
├── store.js                # 入口文件
└── package.json
```

## 主要页面

| 页面 | 路径 | 功能 |
|------|------|------|
| 登录 | `/login.html` | 用户认证 |
| 首页 | `/index.html` | 系统概览 |
| 添加商品 | `/products.html` | 新增商品信息 |
| 商品列表 | `/product_list.html` | 查看、编辑商品 |
| 入库管理 | `/in.html` | 办理入库，供应商自动完成 |
| 入库记录 | `/in_records.html` | 查看入库历史 |
| 出库管理 | `/out.html` | 办理出库，客户自动完成 |
| 出库记录 | `/out_records.html` | 查看、导出出库单 |
| 库存查看 | `/stock.html` | 库存总览 |
| 库存查询 | `/query.html` | 按商品/月份查询 |

## API 接口

### 认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/current-user` - 获取当前用户

### 商品
- `GET /api/products` - 商品列表
- `POST /api/products` - 添加商品
- `PUT /api/products/:id` - 更新商品
- `DELETE /api/products/:id` - 删除商品

### 出入库
- `POST /api/in` - 入库
- `POST /api/out` - 出库
- `GET /api/in-records` - 入库记录
- `GET /api/out-records` - 出库记录
- `GET /api/suppliers?query=` - 供应商搜索
- `GET /api/customers?query=` - 客户搜索

## 数据库表结构

主要表：
- `users` - 用户表
- `products` - 商品表
- `in_records` - 入库记录
- `out_records` - 出库记录
- `stock_methods` - 出入库方式

## 导出功能

支持两种导出格式：

1. **Excel 导出**（推荐）：使用 ExcelJS 库，支持单元格合并、样式、边框
2. **CSV 导出**：备用方案，纯文本格式

导出文件命名规则：`销售出库单_YYYYMMDD.xlsx`

## 安全特性

- 密码使用 bcryptjs 加密存储
- Session 会话管理
- 页面访问权限控制
- SQL 注入防护（使用参数化查询）
- XSS 基础防护

## 开发计划

- [ ] 库存盘点功能
- [ ] 数据备份/恢复
- [ ] 多仓库支持
- [ ] 操作日志审计
- [ ] 条码扫描支持

## 贡献指南

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT License
