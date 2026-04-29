FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com && npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
