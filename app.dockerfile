FROM node:20.18.0-slim AS builder

WORKDIR /home/perplexica

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY tsconfig.json next.config.mjs next-env.d.ts postcss.config.js drizzle.config.ts tailwind.config.ts ./
COPY src ./src
COPY public ./public

# 复制示例配置文件作为临时配置（仅用于构建）
COPY config.toml ./config.toml

RUN mkdir -p /home/perplexica/data
RUN yarn build

# 构建完成后删除临时配置文件
RUN rm config.toml

FROM node:20.18.0-slim

WORKDIR /home/perplexica

COPY --from=builder /home/perplexica/public ./public
COPY --from=builder /home/perplexica/.next/static ./public/_next/static

COPY --from=builder /home/perplexica/.next/standalone ./
COPY --from=builder /home/perplexica/data ./data

# 复制 drizzle 配置文件（用于数据库初始化）
COPY drizzle.config.ts ./drizzle.config.ts
COPY src/lib/db ./src/lib/db

RUN mkdir /home/perplexica/uploads

CMD ["node", "server.js"]