# Sử dụng Node LTS (20.x hoặc 22.x)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files trước để cache dependency
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ code
COPY . .

# Generate Prisma Client (chạy sau khi copy schema)
RUN npx prisma generate

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "run", "start"]
