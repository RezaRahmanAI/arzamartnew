const http = require('http');
const next = require('next');

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

app.prepare().then(() => {
  http.createServer((req, res) => {
    handle(req, res);
  }).listen(port, () => {
    console.log(`> Ready on ${port}`);
  });
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
