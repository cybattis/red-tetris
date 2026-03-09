FROM node:24-alpine

WORKDIR /app/backend

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8000
ENTRYPOINT ["./startup.sh"]
