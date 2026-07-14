FROM nginx:alpine

# Nur is 100% static — no server-side code, no database. This container exists only to
# put the already-built `web/dist` output behind Cloud Run's URL for the demo.
COPY web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
