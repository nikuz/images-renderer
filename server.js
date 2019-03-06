
const http = require('http');
const fs = require('fs');

const hostname = '127.0.0.1';
const port = 5678;
const lastModified = new Date();

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    let cont;
    let contentType;

    if (req.url.indexOf('bundle.js') !== -1) {
        contentType = 'text/javascript';
        cont = fs.readFileSync('./dst/bundle.js');
    } else {
        contentType = 'text/html';
        cont = fs.readFileSync('./dst/index.html');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('last-modified', lastModified);
    res.setHeader('Cache-Control', 'max-age=86400');
    res.end(cont);
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`); // eslint-disable-line
});
