# --- Stage 1: Build React App ---
    FROM node:18-alpine AS builder

    WORKDIR /app
    
    COPY package.json package-lock.json ./
    RUN npm install
    
    COPY . .
    RUN npm run build
    
    # --- Stage 2: Serve with NGINX ---
    FROM nginx:alpine
    
    WORKDIR /usr/share/nginx/html  
    
    COPY --from=builder /app/build .  
    
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    