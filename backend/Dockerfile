FROM node:24-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

EXPOSE 8000
ENTRYPOINT ["./startup.sh"]
