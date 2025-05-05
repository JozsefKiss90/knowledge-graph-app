# Stage 1: Build React app
FROM node:18 as build
WORKDIR /app

# Copy and install dependencies first
COPY package*.json ./
RUN npm install

# Copy production env and app code
COPY . .
COPY .env.production .env

RUN npm run build

# Stage 2: Serve via NGINX
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
