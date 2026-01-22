# 使用多阶段构建减小镜像体积

# 构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 设置 npm 镜像加速 (腾讯云内网源)
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/

# 复制依赖文件
COPY backend/package*.json ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm ci

# 复制 Prisma Schema
COPY backend/prisma ./prisma/

# 生成 Prisma Client (使用 dummy URL)
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy" npx prisma generate

# 复制源代码
COPY backend/ .

# 构建 TypeScript 代码
RUN npm run build

# 清理 devDependencies，只保留生产依赖
RUN npm prune --production

# 运行阶段
FROM node:20-alpine

# 安装 OpenSSL (Prisma 需要)
RUN apk add --no-cache openssl ca-certificates

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=80

# 复制依赖 (包含已生成的 Prisma Client)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 复制启动脚本
COPY backend/start.sh ./start.sh
RUN chmod +x ./start.sh

# 暴露端口
EXPOSE 80

# 启动命令
CMD ["./start.sh"]
