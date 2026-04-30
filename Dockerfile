FROM node:22-alpine
WORKDIR /app
COPY . .
RUN cd backend && npm install --omit=dev
EXPOSE 8080
CMD ["node", "backend/server.js"]
