FROM node:22-alpine
WORKDIR /app
COPY . .
RUN cd backend && npm install --omit=dev
ENV FRONTEND_DIR=/app
EXPOSE 8080
CMD ["node", "backend/server.js"]
