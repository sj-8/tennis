# 使用多阶段构建减小镜像体积

# 构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY backend/package*.json ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm install

# 复制 Prisma Schema 并生成 Client
COPY backend/prisma ./prisma/
COPY backend/prisma.config.ts ./
# 在构建时生成 Prisma Client 需要 DATABASE_URL，但构建环境可能没有。
# 使用 --no-engine 或设置一个临时的环境变量来绕过检查，或者只生成客户端代码而不尝试连接数据库。
# Prisma 7 需要配置，我们可以给一个假的 URL 用于构建阶段，实际运行时会用真实环境变量。
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy" npx prisma generate

# 复制源代码
COPY backend/ .

# 构建 TypeScript 代码
RUN npm run build

# 运行阶段
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=80

# 复制依赖文件
COPY backend/package*.json ./

# 只安装生产环境依赖
RUN npm install --production

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# 重新生成 Prisma Client (确保二进制文件匹配)
# 同样使用 dummy URL，因为我们只是需要生成代码
RUN DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy" npx prisma generate

# 暴露端口
EXPOSE 80

# 启动命令
CMD ["npm", "start"]
