const http = require('http');
const fs = require('fs');
const qs = require('qs');
const url = require('url');
const localStorage = require('local-storage');

let server = http.createServer((req, res) => {
    readSession(req, res);
});

server.listen(8080, () => {
    console.log('http://localhost:8080');
});

let handlers = {};
handlers.login = (req, res) => {
    fs.readFile('./views/login.html', 'utf-8', (err, data) => {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        res.end();
    });
};
handlers.notfound = (req, res) => {
    fs.readFile('./views/notfound.html', 'utf-8', (err, data) => {
        res.writeHead(404);
        res.write(data);
        res.end();
    });
};
handlers.info = (req, res) => {
    let data = '';
    req.on('data', chunk => {
        data += chunk;
    });
    req.on('end', () => {
        data = qs.parse(data);
        let expires = Date.now() + 1000 * 60 * 60;
        let tokenSession = `{"name": "${data.name}", "email": "${data.email}", "password": "${data.password}", "expires": "${expires}"}`;
        let tokenId = createRandomString(20);
        createTokenSession(tokenId, tokenSession);
        localStorage.set('token', tokenId);
        fs.readFile('./views/info.html', 'utf-8', (err, dataHtml) => {
            if (err) {
                console.log(err);
            }
            dataHtml = dataHtml.replace('{name}', data.name);
            dataHtml = dataHtml.replace('{email}', data.email);
            dataHtml = dataHtml.replace('{password}', data.password);
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(dataHtml);
            res.end();
        })
    });
    req.on('error', () => {
        console.log('error');
    });
};

let router = {
    'info': handlers.info,
    'login': handlers.login,
    'notfound': handlers.notfound
}

let createRandomString = (strLength) => {
    strLength = typeof strLength === 'number' && strLength > 0 ? strLength : false;
    if (strLength) {
        let possibleCharacter = 'abcdefghiklmnopqwerszx1234567890';
        let str = '';
        for (let i = 0; i < strLength; i++) {
            let randomCharacter = possibleCharacter.charAt(Math.floor(Math.random() * possibleCharacter.length));
            str += randomCharacter;
        }
        return str;
    }
}

let createTokenSession = (fileName, data) => {
    fileName = './token/' + fileName;
    fs.writeFile(fileName, data, err => {
    });
}

let readSession = (req, res) => {
    let tokenId = localStorage.get('token');
    if (tokenId) {
        let sessionString = '';
        let expires = 0;
        fs.readFile('./token/' + tokenId, 'utf-8', (err, data) => {
            if (err) {
                console.log(err);
            }
            sessionString = String(data);
            let parseSessionString = JSON.parse(sessionString);
            expires = parseSessionString.expires;
            let now = Date.now();
            if (expires < now) {
                let parseUrl = url.parse(req.url);
                let path = parseUrl.pathname;
                let trimPath = path.replace(/^\/+|\/+$/g, '');
                let chosenHandler = (typeof router[trimPath] !== 'undefined') ? router[trimPath] : handlers.notfound;
                chosenHandler(req, res);
            } else {
                fs.readFile('./views/dashboard.html', 'utf-8', (err, dataHtml) => {
                    if (err) {
                        console.log(err);
                    }
                    dataHtml = dataHtml.replace('{name}', parseSessionString.name);
                    dataHtml = dataHtml.replace('{email}', parseSessionString.email);
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.write(dataHtml);
                    res.end();
                });
            }
        });
    } else {
        let parseUrl = url.parse(req.url);
        let path = parseUrl.pathname;
        let trimPath = path.replace(/^\/+|\/+$/g, '');
        let chosenHandler = (typeof router[trimPath] !== 'undefined') ? router[trimPath] : handlers.notfound;
        chosenHandler(req, res);
    }
}