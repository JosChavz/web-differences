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
    .option('--depth', "The depth to crawl the site to")
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
let queue = [];
let depthArray = [];
queue.push(yaml_doc.origin);
let visited = new Set();
let depthVisited = 0;

(async () => {
    await driversInitialize(originDriver, yaml_doc.origin);
    await driversInitialize(destinationDriver, yaml_doc.destination);

    do {
        const currentLink = queue.shift();

        const originURL = new URL(currentLink);
        const changedURL = originURL.href.replace(originURL.host, DESTINATION_BASE_URL.host);
        const destinationURL = new URL(changedURL);

        // Visit the link
        const actualLink = await originDriver.visit(currentLink);
        await destinationDriver.visit(destinationURL);

        // Test to see if the link exists in the visited set
        if (visited.has(actualLink)) {
            decrementDepth();
            console.log("Actual link: " + actualLink + ", Current Link: " + currentLink);
            continue;
        }

        // Take screenshot of the current page
        const originImagePath = await originDriver.takeScreenshot(originURL, 'origin');
        const destImagePath = await destinationDriver.takeScreenshot(destinationURL, 'dest');

        await originDriver.compareScreenshots(originImagePath, destImagePath);

        // Get all links
        const originLinks = await originDriver.getLinks(yaml_doc.blacklistSinglePaths,
            yaml_doc.blacklistChildrenPaths);

        // Go through all the links
        originLinks.filter((link) => {
            // Returns if the link is not in the pathTaken array
            return !queue.includes(link);
        });

        // Merge the two arrays
        queue = [...new Set([...queue,...originLinks])]

        // Simple console logs
        console.log("Size of queue: " + queue.length);
        //console.log("Current link: " + queue[currentLink - 1]);
        console.log("Next link " + queue[0]);

        // Add to visited set
        visited.add(actualLink);
        decrementDepth();
    } while (queue.length > 0 || depthVisited < yaml_doc.depth);

    await originDriver.closeDriver();
})();

/***********************************************************************************************
 * FUNCTIONS
 **********************************************************************************************/

async function driversInitialize(driver, url) {
    await driver.initDriver();
    // Adds cookie(s) to the browser
    if (yaml_doc.cookies) {
        console.log("Adding cookies to the browser");
        await driver.setCookie(yaml_doc.cookies, url);
    }
}

function decrementDepth() {
    if (depthArray.length > 0) {
        depthArray[0] -= 1;
        if (depthArray[0] === 0) {
            depthArray.shift();
            depthVisited += 1;
        }
    }
}
