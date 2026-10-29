# syntax=docker/dockerfile:1
# 빌드는 여기서 끝내고, 컨테이너 시작 명령은 서버 실행만 한다(기동 때 스키마·시드는 앱이 스스로 넣는다).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG RELEASE_ID=dev
ENV RELEASE_ID=$RELEASE_ID
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ARG RELEASE_ID=dev
ENV RELEASE_ID=$RELEASE_ID
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# 시드 파일(앱이 처음 뜰 때 읽는다)
COPY --from=build /app/data ./data
EXPOSE 3000
CMD ["node", "server.js"]
