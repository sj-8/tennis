### 问题根源
**为什么 OpenID 会变？**
1.  **公网访问不带身份**：您的前端使用 `uni.request` 访问云托管的公网域名。这种方式下，微信云托管**不会**自动注入 `x-wx-openid` 请求头（只有走微信私有链路 `callContainer` 才会带）。
2.  **后端回退逻辑**：后端代码发现没有 `x-wx-openid` 头，就**错误地**使用了前端传来的 `code` 作为 OpenID。
3.  **Code 是动态的**：`code` 是一次性登录凭证，每次调用 `uni.login` 都会生成一个新的。
4.  **结果**：数据库把变化的 `code` 当作 `openid` 存储，导致每次登录都被识别为“新用户”。

### 解决方案
我们需要完善后端的登录逻辑：**当没有云托管自动注入的 OpenID 时，使用 `code` 换取真实的 OpenID。**

### 实施计划
1.  **安装依赖**：在后端安装 `axios` 库，用于向微信服务器发送请求。
2.  **修改代码**：更新 `backend/src/controllers/authController.ts`，增加调用微信 `jscode2session` 接口的逻辑。
3.  **配置环境**：代码修改后，您需要在微信云托管控制台设置两个环境变量：
    *   `WX_APP_ID`: 您的小程序 AppID
    *   `WX_APP_SECRET`: 您的小程序 AppSecret

### 确认
请确认是否执行此修复方案？（执行后您需要去微信后台获取 AppSecret 并配置环境变量）