FROM node:24-alpine
WORKDIR /app

# Install packages first, so Docker can reuse this layer when only code changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
# The migrations and the demo event run when the API starts.
CMD ["node", "dist/main.js"]
