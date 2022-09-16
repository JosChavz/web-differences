const webdriver = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const fs = require("fs");
const path = require("path");
const pixelmatch = require('pixelmatch');
const {Options} = require("selenium-webdriver/lib/webdriver");
const PNG = require('pngjs').PNG;

class Driver {
    constructor(pathToImages, url) {
        this.pathToImages = pathToImages;
        this.driver = null;
        this.url = new URL(url);
    }

    /**
     * @description - Initializes the webdriver
     */
    async initDriver() {
        this.driver = await new webdriver.Builder()
            .forBrowser('chrome')
            .build();
        await this.driver.manage().window().maximize();
    }

    /**
     * @description - Clears the cache folder and files
     * @param {string} cacheFolderPath - The path to the cache folder
     */
    clearCache(cacheFolderPath) {
        if (fs.existsSync(cacheFolderPath)) {
            fs.rmdirSync(cacheFolderPath, {recursive: true});
        }
        fs.mkdirSync(cacheFolderPath);
    }

    /**
     * @description - Adds cookie to the webdriver
     * @param {array} cookies - An array of cookies to add to the webdriver
     * @param {string} baseURL - The URL to add the cookie to
     */
    async setCookie(cookies, baseURL) {
        await this.driver.get(baseURL);
        for (let cookie of cookies) {
            const tempCookie = new Options.Cookie();
            tempCookie.name = cookie.name;
            tempCookie.value = cookie.value;

            try {
                await this.driver.manage().addCookie(tempCookie);
            } catch (e) {
                console.log(tempCookie)
                console.log("Invalid cookie.");
            }
        }
    }

    async visit(url) {
        await this.driver.get(url);
        return this.driver.getCurrentUrl();
    }

    /**
     * @description - Takes a screenshot of the passed URL and stores it in the designated directory
     * also depending on the passed URL given the pathname into a directory
     * @param {URL} url - The URL to take a screenshot of
     * @param {string} dir - The directory to store the screenshot (origin or dest)
     * @returns {Promise<string>}
     */
    async takeScreenshot(url, dir) {
        const urlToDir = (url.pathname === '/') ? 'home' :
            url.pathname.substring(1).replace(/\//g, '_');
        const cacheFolderPath = 'images/' + dir + '/' + urlToDir;
        let i, height, _y;
        i = height = _y = 0;

        // Create the directory if it doesn't exist
        if (!fs.existsSync(cacheFolderPath)) {
            fs.mkdirSync(cacheFolderPath, {recursive: true});
        }

        // Get the height of the rendered page
        height = await this.driver.executeScript('return document.body.parentNode.scrollHeight');

        await this.driver.wait(async () => {
            return await this.driver.executeScript('return document.readyState').then(function(readyState) {
                return readyState === 'complete';
            });
        });

        // Scroll and screenshot until the entire page is captured
        while (_y < height) {
            await this.driver.executeScript('window.scrollTo(0, ' + _y + ')');
            await this.delay(1000);
            // Takes a screenshot then saves it into the cache folder
            await this.driver.takeScreenshot()
                .then((data) => {
                    fs.writeFileSync(path.join(cacheFolderPath, `image_${i++}.png`), data, 'base64');
                });

            _y += await this.driver.manage().window().getRect().then((rect) => {
                return rect.height;
            });
        }

        return cacheFolderPath;
    }

    async getLinks(blacklistPaths, blacklistChildrenPaths) {
        const links = await this.driver.findElements(webdriver.By.tagName('a'));
        const hrefs = [];
        for (let link of links) {
            let href = await link.getAttribute('href');

            // If the link is not null and is not a mailto link, then add it to the array
            if (href) {
                // Strips off the query, hash, and search params
                href = href.split('?')[0].split('#')[0];

                const tempURL = new URL(href);
                // And it is a relative URL
                // Also if the link is not a link to the same page
                if (tempURL.hostname === this.url.hostname &&
                    tempURL.pathname !== this.url.pathname &&
                    !blacklistPaths.includes(tempURL.pathname)) {

                    let isChild = false;

                    blacklistChildrenPaths.forEach((path) => {
                        const pathname = tempURL.pathname;

                        // If the path is a child of the blacklist path BUT is not the blacklist path
                        if (pathname.includes(path) && pathname !== path) {
                            isChild = true;
                            return;
                        }
                    });

                    if (!isChild) {
                        // Checks to see if contains a / at the end
                        if (href[href.length - 1] !== '/') {
                            href += '/';
                        }

                        hrefs.push(href);
                    }
                }
            }
        }

        // Removes any duplicate links
        return hrefs.filter((href, index) => {
            return hrefs.indexOf(href) === index;
        });
    }

    /**
     * @description - Compares the screenshots in the cache folder to the screenshots in the
     * destination array. If the screenshots are different, then store into the diff folder
     * @param {string} cacheFolderPath - The path to the cache folder to store the images
     * @param {string} destinationFolderPath - The path to the destination folder to store the images
     */
    compareScreenshots(cacheFolderPath, destinationFolderPath) {
        this.clearCache('diff');
        const cacheFolderRename = cacheFolderPath.replace('cache', '').replace(/\//g, '_');

        const cacheFolderContents = fs.readdirSync(cacheFolderPath);
        const destinationFolderContents = fs.readdirSync(destinationFolderPath);

        for (let file of cacheFolderContents) {
            if (destinationFolderContents.includes(file)) {
                const img1 = PNG.sync.read(fs.readFileSync(path.join(cacheFolderPath, file)));
                const img2 = PNG.sync.read(fs.readFileSync(path.join(destinationFolderPath, file)));
                const {width, height} = img1;
                const diff = new PNG({width, height});
                const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {threshold: 0.85});
                if (numDiffPixels > 0) {
                    fs.writeFileSync(path.join('diff', `${cacheFolderRename}${file}`), PNG.sync.write(diff));
                }
            }
        }
    }

    /**
     * @description - Closes the webdriver
     */
    async closeDriver() {
        if (this.driver) {
            await this.driver.quit();
        }
    }

    delay(time) {
        return new Promise(resolve => setTimeout(resolve, time));
    }
}

module.exports = Driver;
