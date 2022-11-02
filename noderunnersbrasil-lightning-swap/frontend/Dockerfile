FROM node:16-alpine
WORKDIR /app
COPY package.json /app
COPY package-lock.json /app
COPY . /app
RUN npm i
EXPOSE 5173
EXPOSE 4173
CMD [ "npm", "run", "dev" ]
