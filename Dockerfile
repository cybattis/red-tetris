FROM node:24-alpine

WORKDIR /app

COPY . .
RUN chmod 777 entrypoint-prod.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint-prod.sh"]
