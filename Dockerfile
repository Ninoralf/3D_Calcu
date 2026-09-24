FROM node:22-alpine
WORKDIR /app
COPY package.json server.js 3D_Print_Calculator.html 3D_Print_Calculator.css 3D_Print_Calculator.js ./
EXPOSE 3000
CMD ["npm", "start"]
