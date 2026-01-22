# 使用 Debian-slim 镜像替代 Alpine，解决 Prisma/OpenSSL 兼容性问题
FROM node:20-slim AS builder

# 设置工作目录
WORKDIR /app

# 安装构建所需的系统依赖
RUN apt-get update -y && apt-get install -y openssl

# 设置 npm 镜像加速 (混合策略：优先腾讯云，失败回退)
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/

# 复制依赖文件
COPY backend/package*.json ./

# 安装依赖 (增加超时时间，跳过可选依赖)
RUN npm install --no-optional --fetch-timeout=300000 --fetch-retries=5

# 复制 Prisma Schema
COPY backend/prisma ./prisma/

# 生成 Prisma Client
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy" npx prisma generate

# 复制源代码
COPY backend/ .

# 构建
RUN npm run build

# 清理开发依赖
RUN npm prune --production

# 运行阶段
FROM node:20-slim

# 安装运行所需的系统依赖
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 环境变量
ENV NODE_ENV=production
ENV PORT=80
ENV TZ=Asia/Shanghai

# 复制依赖和构建产物
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 复制启动脚本
COPY backend/start.sh ./start.sh
RUN chmod +x ./start.sh

# 暴露端口
EXPOSE 80

# 启动
CMD ["./start.sh"]
