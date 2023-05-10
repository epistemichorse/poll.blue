FROM alpine:3.17.3 as build

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}
ARG DENO_VERSION=1.33.2

ENV DENO_VERSION=${DENO_VERSION}

RUN apk update && apk add curl

RUN set -x \
    && curl -L -o /tmp/deno.zip https://github.com/denoland/deno/releases/download/v${DENO_VERSION}/deno-x86_64-unknown-linux-gnu.zip \
    && unzip -d /usr/local/bin /tmp/deno.zip \
    && rm -rf /tmp/deno.zip \
    && chmod +x /usr/local/bin/deno

# -------------
FROM frolvlad/alpine-glibc:alpine-3.13_glibc-2.32

RUN apk update && apk add curl nginx

COPY --from=build /usr/local/bin/deno /usr/local/bin/deno
ENV DENO_DIR /root/.deno
RUN set -x \
    && addgroup -g 1000 -S deno \
    && adduser -u 1000 -S deno -G deno
VOLUME [ "/root/.deno" ]

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /run/nginx

EXPOSE 3000

WORKDIR /app
ADD . /app
RUN cp .prod.env .env
RUN deno cache app/main.ts --import-map=import_map.json
CMD ./scripts/start.sh