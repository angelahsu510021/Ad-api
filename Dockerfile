FROM node:14.16.1
WORKDIR /api-server
COPY . /api-server
RUN npm install
EXPOSE 7002
CMD npm start