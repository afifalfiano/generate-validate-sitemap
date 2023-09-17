const fs = require('fs');
const convert = require('xml-js');
const fetch = require('node-fetch');
const hostBaseURL = 'http://website.com/detail';
const untrackedUrlsList = [];
const options = { compact: true, ignoreComment: true, spaces: 4 };
let totalData = 0;


// Start Generate Sitemap

const collectSitemap = (data = []) => {
    if (data.length > 0) {
        data.forEach(item => {
            const modifiedURL = item.title.replace(/[@\s!^\/\\#,+()$~%.'":*?<>{}]/g, '-').toLowerCase() + `?id=${item.id}`;
            const encodingURL = encodeURI(modifiedURL);
            untrackedUrlsList.push(`${hostBaseURL}/${encodingURL}`);
        });
    }
}

const fetchData = async (paramLimit = 10, paramPage = 0) => {
        try {
            const url = `https://jsonplaceholder.typicode.com/todos?_limit=${paramLimit}&_start=${paramPage}`;
            const data = await fetch(url)
            return data.json();
        } catch (error) {
            console.log(error);
        }
}


const generateSitemap = async () => {
    try {
        const callAPI = [];
        const initAPI = await fetchData(10, 0);
        totalData = initAPI?.totalPage || 200;
        for (let index = 1; index <= totalData; index++) {
            callAPI.push(fetchData(10 + 10, 10 + index));
        }
        const data = await Promise.all([...callAPI]);
        data.forEach(item => {
            collectSitemap(item);
        })
        filterUniqueURLs();
    } catch (error) {
        console.log(error);
    }
}

const filterUniqueURLs = () => {
    fs.readFile('sitemap.xml', (err, data) => {
        if (data) {
            const existingSitemapList = JSON.parse(convert.xml2json(data, options));
            let existingSitemapURLStringList = [];
            if (existingSitemapList.urlset && existingSitemapList.urlset.url && existingSitemapList.urlset.url.length) {
                existingSitemapURLStringList = existingSitemapList.urlset.url.map(ele => ele.loc._text);
            }

            const removeDuplicate = [...new Set(untrackedUrlsList)];
            removeDuplicate.forEach((ele, i) => {
                if (existingSitemapURLStringList.indexOf(ele) == -1) {
                    existingSitemapList.urlset.url.push({
                        loc: {
                            _text: ele,
                        },
                        priority: {
                            _text: 0.8
                        },
                    });
                }
            });
            createSitemapFile(existingSitemapList);
        }
    });
}


const createSitemapFile = (list) => {
    const finalXML = convert.json2xml(list, options);
    saveNewSitemap(finalXML);
}


const saveNewSitemap = (xmltext) => {
    fs.writeFile('sitemap.xml', xmltext, (err) => {
        if (err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });
}

// End Generate URL

// Start Validate URL 
const urlStatus = [];


function readURLSitemap() {
    fs.readFile('sitemap.xml', 'utf8', (err, data) => {
        if (err) {
            return console.log(err);
        }
        const { urlset: { url } } = JSON.parse(convert.xml2json(data, options));
        url.forEach((item, idx) => {
            const isValid = isValidUrl(item.loc._text);
            urlStatus.push({ url: item.loc._text, statusUrl: isValid })

        })

        console.table(urlStatus);
        writeLog()
    });
}

function writeLog() {
    let data = JSON.stringify(urlStatus, null, 2);

    fs.writeFile('log-sitemap.json', data, (err) => {
        if (err) throw err;
        console.log('Data written to file');
    });
}

function isValidUrl(urlString) {
    var urlPattern = new RegExp('^(https?:\\/\\/)?' + // validate protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // validate domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // validate OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // validate port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // validate query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // validate fragment locator
    return !!urlPattern.test(urlString);
}

// End Validate URL



// Run function to generate sitemap.xml and then check the URL valid or not
generateSitemap().then(() => {
    readURLSitemap();
})