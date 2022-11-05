FROM node:16-alpine
WORKDIR /app
COPY package.json /app
COPY package-lock.json /app
COPY . /app
RUN npm i
EXPOSE 5173
RUN npm run build
CMD [ "npm", "run", "preview" ]