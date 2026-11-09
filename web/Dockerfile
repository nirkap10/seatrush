FROM node:24-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 5173
# Serve the built files. --host lets the browser outside the container reach it.
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]
