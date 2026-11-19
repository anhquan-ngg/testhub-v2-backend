# Keep the PostgreSQL ABI and Alpine libc identical across build/runtime stages.
FROM postgres:17.9-alpine3.23@sha256:6f30057d31f5861b66f3545d4821f987aacf1dd920765f0acadea0c58ff975b1 AS vector-build

RUN apk add --no-cache build-base \
    && wget -O /tmp/pgvector.tar.gz https://codeload.github.com/pgvector/pgvector/tar.gz/refs/tags/v0.8.1 \
    && echo "a9094dfb85ccdde3cbb295f1086d4c71a20db1d26bf1d6c39f07a7d164033eb4  /tmp/pgvector.tar.gz" | sha256sum -c - \
    && mkdir /tmp/pgvector \
    && tar -xzf /tmp/pgvector.tar.gz -C /tmp/pgvector --strip-components=1 \
    && cd /tmp/pgvector \
    && make OPTFLAGS="" with_llvm=no \
    && make install with_llvm=no DESTDIR=/opt/pgvector

FROM postgres:17.9-alpine3.23@sha256:6f30057d31f5861b66f3545d4821f987aacf1dd920765f0acadea0c58ff975b1

COPY --from=vector-build /opt/pgvector/usr/local/ /usr/local/
RUN test -s /usr/local/lib/postgresql/vector.so \
    && test -s /usr/local/share/postgresql/extension/vector.control
