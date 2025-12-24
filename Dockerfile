# Use an official Node.js runtime as a parent image
FROM node:22.14.0

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Copy the rest of the application source code to the working directory
COPY ./src ./src
COPY tsconfig.json .
COPY tsup.config.ts .
COPY vite.config.mts .
COPY .prettierrc .
COPY .prettierignore .
COPY .eslintrc.json .
COPY .eslintignore .
COPY ./public ./public

# Run application build
RUN  npm run build

# Run the application
CMD ["npm", "start"]

# Expose the port that the app runs on
EXPOSE 4000