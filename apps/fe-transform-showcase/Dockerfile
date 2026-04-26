FROM node:20-alpine AS builder

WORKDIR /workspace

COPY packages/react/package.json packages/react/package.json
COPY packages/react/package-lock.json packages/react/package-lock.json
COPY packages/react/tsconfig.json packages/react/tsconfig.json
COPY packages/react/tsup.config.ts packages/react/tsup.config.ts
COPY packages/react/src packages/react/src

COPY apps/fe-transform-showcase/package.json apps/fe-transform-showcase/package.json
COPY apps/fe-transform-showcase/package-lock.json apps/fe-transform-showcase/package-lock.json
COPY apps/fe-transform-showcase/index.html apps/fe-transform-showcase/index.html
COPY apps/fe-transform-showcase/tsconfig.json apps/fe-transform-showcase/tsconfig.json
COPY apps/fe-transform-showcase/tsconfig.node.json apps/fe-transform-showcase/tsconfig.node.json
COPY apps/fe-transform-showcase/vite.config.ts apps/fe-transform-showcase/vite.config.ts
COPY apps/fe-transform-showcase/src apps/fe-transform-showcase/src

RUN npm --prefix packages/react ci --no-audit --no-fund
RUN npm --prefix packages/react run build
RUN npm --prefix apps/fe-transform-showcase ci --no-audit --no-fund
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm --prefix apps/fe-transform-showcase run build

FROM nginx:1.27-alpine

COPY --from=builder /workspace/apps/fe-transform-showcase/dist /usr/share/nginx/html

EXPOSE 80