const fs = require('fs');
const convert = require('xml-js');
const fetch = require('node-fetch');
const hostBaseURL = 'http://website.com/detail';
const untrackedUrlsList = [];
const options = { compact: true, ignoreComment: true, spaces: 4 };
let totalData = 0;



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

generateSitemap();