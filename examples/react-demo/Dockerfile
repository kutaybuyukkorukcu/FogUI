FROM node:20-alpine AS builder
WORKDIR /workspace

COPY packages/react ./packages/react
COPY examples/react-demo ./examples/react-demo

RUN npm --prefix packages/react ci --no-audit --no-fund
RUN npm --prefix packages/react run build
RUN npm --prefix examples/react-demo ci --no-audit --no-fund
RUN npm --prefix examples/react-demo run build

FROM nginx:alpine
COPY --from=builder /workspace/examples/react-demo/dist /usr/share/nginx/html
EXPOSE 80
