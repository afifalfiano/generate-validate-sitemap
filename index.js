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

const fetchData = async (limit = 10, start = 0) => {
        try {
            const url = `https://jsonplaceholder.typicode.com/todos?_limit=${limit}&_start=${start}`;
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
        for (let index = 0; index <= totalData; index++) {
            callAPI.push(fetchData(10, index));
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
    const newDate = new Date();
    const date = [ newDate.getFullYear(), ('0' + (newDate.getMonth() + 1)).slice(-2), ('0' + newDate.getDate()).slice(-2)].join('-');
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
                        changefreq: {
                            _text: 'monthly'
                        },
                        lastmod: {
                            _text: date
                        }
                    });
                }
            });
            createAndSaveSitemapFile(existingSitemapList);
        }
    });
}


const createAndSaveSitemapFile = (list) => {
    const finalXML = convert.json2xml(list, options);
    fs.writeFile('sitemap.xml', finalXML, (err) => {
        if (err) {
            return console.log(err);
        }

        console.log("Success generate sitemap.xml!");
        readFileSitemap();
    });
}


// End Generate URL

// Start Validate URL 
const urlStatus = [];


function readFileSitemap() {
    fs.readFile('sitemap.xml', 'utf8', (err, data) => {
        if (err) {
            return console.log(err);
        }
        const { urlset: { url } } = JSON.parse(convert.xml2json(data, options));
        url.forEach((item, idx) => {
            const isValid = isValidUrl(item.loc._text);
            const splitUrl = item.loc._text.split('?id=');
            urlStatus.push({ 
                url: item.loc._text,
                id: splitUrl[1],
                title: splitUrl[0].split(`${hostBaseURL}/`)[1],
                statusUrl: isValid 
            })

        })

        writeLogSitemap()
    });
}

function writeLogSitemap() {
    let data = JSON.stringify(urlStatus, null, 2);

    fs.writeFile('log-sitemap.json', data, (err) => {
        if (err) throw err;
        console.log('Success create log');
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
generateSitemap();