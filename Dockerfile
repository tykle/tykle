FROM node:12

RUN apt-get update && apt-get install -y \
  dstat \
  traceroute \
  rsync

# RUN wget http://download.redis.io/redis-stable.tar.gz && \
#     tar xvzf redis-stable.tar.gz && \
#     cd redis-stable && \
#     make && \
#     mv src/redis-server /usr/bin/ && \
#     cd .. && \
#     rm -r redis-stable && \
#     npm install -g concurrently   

# Create app directory
WORKDIR /tykle/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
# COPY package*.json ./

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

RUN npm install
RUN mkdir /tykle/data
RUN ls -la /tykle/app
RUN cp /tykle/app/data/boot-trust.cct /tykle/data

EXPOSE 1919
# CMD [ "node", "server.js" ]

# CMD concurrently "/usr/bin/redis-server --bind '0.0.0.0'"
