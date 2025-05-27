FROM nginx:alpine

# Install necessary packages
RUN apk add --no-cache curl

# Set the working directory
WORKDIR /usr/share/nginx/html

# Copy the application files
COPY index.html .
COPY script.js .
COPY styles.css .
COPY version.js .

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Set healthcheck
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost/ || exit 1

# Command to run the application
CMD ["nginx", "-g", "daemon off;"]