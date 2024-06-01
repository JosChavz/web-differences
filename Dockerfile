#FROM node:20-alpine
#
## Set the working directory in the container
#WORKDIR /usr/src/app
#
#RUN apk update && apk upgrade && \
#    apk --no-cache add bash git openssh
#
## Install PNPM
#RUN npm install -g pnpm
#
## Copy package.json and package-lock.json files
#COPY package.json pnpm-lock.yaml ./
#
## Install dependencies
#RUN pnpm install
#
## Copy the rest of the project files into the container
#COPY . .
#
## Default command
#CMD ["pnpm", "run", "build"]
