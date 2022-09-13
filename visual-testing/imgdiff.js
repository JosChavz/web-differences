const {Command} = require('commander');
const fs = require('fs');
const path = require('path');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const webdriver = require('selenium-webdriver');
const {expect} = require('chai');
const Driver = require('./driver_functions');
const jsonfile = require('jsonfile');
const yaml = require('js-yaml');

const program = new Command();
let yaml_doc;

program
    .version('1.0.0')
    .name('imgdiff')
    .usage('[options]')
    .option('-C, --cookie', "The cookie to set for the browser given the cookies.json file.")
    .parse(process.argv);

const options = program.opts();

// // If no options are given, show the help
// if (Object.keys(options).length === 0) {
//     program.help();
//     process.exit(0);
// }

// Loading up the YAML file
try {
    yaml_doc = yaml.load(fs.readFileSync(path.join(__dirname, 'config.yml'), 'utf8'));
    console.log(yaml_doc);
} catch (e) {
    console.log("Unable to read the YAML file. Closing...");
    process.exit(1);
}

const ORIGIN_BASE_URL = new URL(yaml_doc.origin);
const DESTINATION_BASE_URL = new URL(yaml_doc.destination);
const cacheFolderPath = path.join(__dirname, 'images');
let baseDestinationURL = '';

/***********************************************************************************************
 * SEQUENCE
 **********************************************************************************************/
const originDriver = new Driver("origin", ORIGIN_BASE_URL);
const destinationDriver = new Driver("dest", DESTINATION_BASE_URL);
let pathTaken = [ORIGIN_BASE_URL];
let currentLink = 0;

(async () => {
    await driversInitialize(originDriver, yaml_doc.origin);
    await driversInitialize(destinationDriver, yaml_doc.destination);

    do {
        // Get all links
        const originLinks = await originDriver.getLinks(yaml_doc.blacklistSinglePaths,
            yaml_doc.blacklistChildrenPaths);

        // Go through all the links
        originLinks.filter((link) => {
            // Returns if the link is not in the pathTaken array
            return !pathTaken.includes(link);
        });

        // Merge the two arrays
        pathTaken = [...new Set([...pathTaken,...originLinks])]

        // Take screenshot of the current page
        const originURL = new URL(pathTaken[currentLink]);
        const changedURL = originURL.href.replace(originURL.host, DESTINATION_BASE_URL.host);
        const destinationURL = new URL(changedURL);

        const originImagePath = await originDriver.takeScreenshot(originURL, 'origin');
        const destImagePath = await destinationDriver.takeScreenshot(destinationURL, 'dest');

        await originDriver.compareScreenshots(originImagePath, destImagePath);

        // Go to the next link
        await originDriver.driver.get(pathTaken[currentLink++]);

        // Simple console logs
        console.log("Size of pathTaken: " + pathTaken.length);
        console.log("Current link: " + pathTaken[currentLink - 1]);
        console.log("Next link " + pathTaken[currentLink]);
    } while (currentLink < pathTaken.length);

    await originDriver.closeDriver();
    await destinationDriver.closeDriver();
})();

/***********************************************************************************************
 * FUNCTIONS
 **********************************************************************************************/

async function driversInitialize(driver, url) {
    await driver.initDriver();
    // Adds cookie(s) to the browser
    if (yaml_doc.cookies) {
        await driver.setCookie(yaml_doc.cookies, url);
    }
}