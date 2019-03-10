
const http = require('http');
const fs = require('fs');
const url = require('url');

const hostname = '127.0.0.1';
const port = 5678;
const lastModified = new Date();

const server = http.createServer((req, res) => {
    if (req.method.toLowerCase() !== 'get' || req.connection.remoteAddress !== '127.0.0.1') {
        res.statusCode = 500;
        res.end('');
        return;
    }

    let cont;
    let contentType;

    if (req.url.indexOf('bundle.js') !== -1) {
        contentType = 'text/javascript';
        cont = fs.readFileSync('./dst/bundle.js');
    } else if (/^\/[^?][^&]+(jpe?g|png)$/.test(req.url)) {
        const urlParts = url.parse(req.url);
        const imagePath = `./dst${urlParts.path}`;
        if (fs.existsSync(imagePath)) {
            contentType = `image/${req.url.replace(/^[^.]+\.(.+)$/, '$1')}`;
            cont = fs.readFileSync(imagePath);
        } else {
            res.statusCode = 500;
            res.end('');
            return;
        }
    } else {
        contentType = 'text/html';
        cont = fs.readFileSync('./dst/index.html');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('last-modified', lastModified);
    res.setHeader('Cache-Control', 'max-age=86400');
    res.end(cont);
});

server.listen(port, hostname, () => {
    console.log(`Client server running at http://${hostname}:${port}/`); // eslint-disable-line
});

