
const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const puppeteer = require('puppeteer');
const uniqid = require('uniqid');
const rimraf = require('rimraf');
const gm = require('gm').subClass({ imageMagick: true });
const formidable = require('formidable');
const Stream = require('stream').Transform;
const EventEmitter = require('events').EventEmitter;

const hostname = '127.0.0.1';
const port = 5679;
const watermarkFile = path.resolve(process.cwd(), 'puppeteer/example-pattern.png');

const windowSet = (page, name, value) => page.evaluateOnNewDocument(`
    Object.defineProperty(window, '${name}', {
        get() {
            return '${value}'
        }
    })
`);

(async () => {
    const browser = await puppeteer.launch({
        args: ['--disable-web-security'],
        // headless: false,
    });

    const server = http.createServer((req, res) => {
        const requestId = uniqid();
        let bodyFields;
        // let bodyFiles;
        let image;
        let filter;
        let watermark = false;
        // let logo = false;
        // let copyright = false;
        let requestFolder;
        const workflow = new EventEmitter();

        workflow.on('res500', (response) => {
            rimraf.sync(requestFolder);
            res.statusCode = 500;
            res.end(response || '');
        });

        workflow.on('res200', (response) => {
            rimraf.sync(requestFolder);
            res.statusCode = 200;
            res.end(response || '');
        });

        workflow.on('render', async () => {
            const startTime = Date.now();
            const page = await browser.newPage();
            await page.setViewport({
                width: 600,
                height: 600,
            });
            await windowSet(page, 'puppeteer', true);

            let frame = 1;
            const base64Reg = /^data:image\/(jpeg|png);base64,/;
            page.on('console', async (msg) => {
                const text = msg.text();
                // console.log(text.substring(0, 100));
                if (text === 'puppeteer: Finish') {
                    console.log('Puppeteer total time: ', (Date.now() - startTime) / 1000); //eslint-disable-line
                    await page.close();
                    workflow.emit('res200');
                } else if (text === 'puppeteer: Error') {
                    await page.close();
                    workflow.emit('res500', text);
                } else {
                    const imageFormat = base64Reg.exec(text);
                    if (imageFormat && imageFormat[1]) {
                        const base64Data = msg.text().replace(base64Reg, '');
                        let frameId = frame;
                        if (frame < 10) {
                            frameId = `00${frame}`;
                        } else if (frame < 100) {
                            frameId = `0${frame}`;
                        }
                        fs.writeFile(`${requestFolder}/${frameId}.${imageFormat[1]}`, base64Data, 'base64', (err) => {
                            if (err) {
                                console.log(err); //eslint-disable-line
                            }
                            frame++;
                        });
                    }
                }
            });

            const requestParams = querystring.stringify(bodyFields);
            // console.log(`http://localhost:5678/?${requestParams}`);
            const response = await page.goto(`http://localhost:5678/?${requestParams}`);

            if (response.status() !== 200) {
                await page.close();
                workflow.emit('res500', `render client responses with ${response.status()}`);
            }
        });

        workflow.on('imageApplyWatermark', () => {
            gm(image)
                .composite(watermarkFile)
                .geometry('+100+150')
                .tile()
                .write(image, (composeErr) => {
                    if (composeErr) {
                        workflow.emit('res500', composeErr.toString());
                    } else {
                        workflow.emit('render');
                    }
                });
        });

        workflow.on('imageApplyFilter', () => {
            const resultHandler = (err) => {
                if (err) {
                    workflow.emit('res500', err.toString());
                } else if (watermark) {
                    workflow.emit('imageApplyWatermark');
                } else {
                    workflow.emit('render');
                }
            };

            switch (filter) {
                case 'sepia':
                    gm(image).sepia().write(image, resultHandler);
                    break;
                case 'spread':
                    gm(image)
                        .spread(100)
                        .write(image, resultHandler);
                    break;
                case 'swirl':
                    gm(image)
                        .swirl(100)
                        .write(image, resultHandler);
                    break;
                case 'paint':
                    gm(image)
                        .paint(10)
                        .write(image, resultHandler);
                    break;
                case 'raise':
                    gm(image)
                        .raise(100, 100)
                        .write(image, resultHandler);
                    break;
                case 'shade': // need to implement
                    // gm(image)
                    //     .extent(100, 100, '+')
                    //     .write(image, resultHandler);
                    resultHandler();
                    break;
                case 'blur':
                    gm(image)
                        .blur(10, 10)
                        .write(image, resultHandler);
                    break;
                case 'grayscale':
                    gm(image)
                        .type('Grayscale')
                        .write(image, resultHandler);
                    break;
                case 'pixelate':
                    gm(image)
                        .scale('10%', '10%')
                        .scale('1000%', '1000%')
                        .write(image, resultHandler);
                    break;
                default:
                    resultHandler();
            }
        });

        workflow.on('imageDownload', () => {
            http.request(image, (imageDownloadRes) => {
                const data = new Stream();
                const contentType = imageDownloadRes.headers['content-type'];
                let format = image.match(/[^.]+$/);
                if (!format || !format[0]) {
                    format = contentType.match(/[^/]+$/)[0];
                }

                imageDownloadRes.on('data', (chunk) => {
                    data.push(chunk);
                });

                imageDownloadRes.on('end', () => {
                    const imageName = `inputImage.${format}`;
                    image = `${requestFolder}/${imageName}`;
                    fs.writeFileSync(image, data.read());

                    bodyFields.imageURL = `http://${hostname}:5678/${requestId}/${imageName}`;

                    if (filter) {
                        workflow.emit('imageApplyFilter', filter);
                    } else {
                        workflow.emit('render');
                    }
                });

                imageDownloadRes.on('error', (err) => {
                    workflow.emit('res500', err);
                });
            }).end();
        });

        workflow.on('bodyParse', () => {
            Object.keys(bodyFields).forEach((key) => {
                const value = bodyFields[key];
                switch (key) {
                    case 'imageURL':
                        image = value;
                        break;
                    case 'filter':
                        filter = value;
                        break;
                    case 'watermark':
                        if (value === 'true' || value === '1') {
                            watermark = true;
                        }
                        break;
                    default:
                }
            });

            if (image) {
                workflow.emit('imageDownload', filter);
            } else {
                workflow.emit('res500', 'No image param');
            }
        });

        workflow.on('bodyGet', () => {
            const form = new formidable.IncomingForm();
            form.parse(req, (err, fields) => {
                if (err) {
                    workflow.emit('res500', err.toString());
                }
                bodyFields = fields;
                // bodyFiles = files;
                workflow.emit('bodyParse', filter);
            });
        });

        workflow.on('createRequestFolder', () => {
            requestFolder = path.resolve(process.cwd(), 'dst', requestId);

            if (!fs.existsSync(requestFolder)) {
                fs.mkdirSync(requestFolder);
                workflow.emit('bodyGet');
            } else {
                workflow.emit('res500', 'request ID duplicate');
            }
        });

        if (req.method.toLowerCase() !== 'post' || req.connection.remoteAddress !== '127.0.0.1') {
            workflow.emit('res500');
        } else {
            workflow.emit('createRequestFolder');
        }
    });

    server.listen(port, hostname, () => {
        console.log(`Puppeteer server running at http://${hostname}:${port}/`); // eslint-disable-line
    });
})();

