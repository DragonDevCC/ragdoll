FROM postgres:latest@sha256:073e7c8b84e2197f94c8083634640ab37105effe1bc853ca4d5fbece3219b0e8

RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    postgresql-server-dev-all \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tmp
RUN git clone https://github.com/pgvector/pgvector.git

WORKDIR /tmp/pgvector
RUN make
RUN make install


RUN cd /var/lib/postgresql/ && \
    openssl req -new -text -passout pass:abcd -subj /CN=localhost -out server.req -keyout privkey.pem && \
    openssl rsa -in privkey.pem -passin pass:abcd -out server.key && \
    openssl req -x509 -in server.req -text -key server.key -out server.crt && \
    chmod 600 server.key && \
    chown postgres:postgres server.key
COPY install-extensions.sql /docker-entrypoint-initdb.d

CMD ["postgres", "-c", "ssl=on", "-c", "ssl_cert_file=/var/lib/postgresql/server.crt", "-c", "ssl_key_file=/var/lib/postgresql/server.key" ]
