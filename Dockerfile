FROM ghcr.io/puppeteer/puppeteer:21.11.0

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Change ownership to pptruser (the default user in puppeteer image)
USER root
RUN chown -R pptruser:pptruser /usr/src/app
USER pptruser

# Install dependencies
RUN npm install

# Copy app source
COPY --chown=pptruser:pptruser . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the app
CMD [ "node", "index.js" ] 