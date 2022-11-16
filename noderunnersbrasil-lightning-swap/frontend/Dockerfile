FROM node:16.16.0-alpine
WORKDIR /app
COPY package.json /app
COPY package-lock.json /app
COPY . /app
EXPOSE 5173
RUN npm i vite
ENTRYPOINT [ "docker-entrypoint.sh" ]
CMD [ "npm", "run", "preview" ]