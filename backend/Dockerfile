# 使用多阶段构建减小镜像体积

# 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm install

# 复制 Prisma Schema 并生成 Client
COPY prisma ./prisma/
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建 TypeScript 代码
RUN npm run build

# 运行阶段
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=80

# 复制依赖文件
COPY package*.json ./

# 只安装生产环境依赖
RUN npm install --production

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 重新生成 Prisma Client (确保二进制文件匹配)
RUN npx prisma generate

# 暴露端口
EXPOSE 80

# 启动命令
CMD ["npm", "start"]
