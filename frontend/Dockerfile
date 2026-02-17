FROM node:24-alpine

WORKDIR /app

COPY startup.sh .
RUN chmod 777 startup.sh

EXPOSE 3000
ENTRYPOINT ["./startup.sh"]
