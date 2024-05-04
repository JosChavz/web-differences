import { parentPort, workerData } from 'worker_threads';

// The URL to crawl is passed as workerData
import { Browser, WebDriver } from './WebDriver';

const urlToCrawl = workerData;

// Create a new WebDriver instance
const driver = new WebDriver(Browser.CHROME);

async function crawlUrl(url: URL) {
  // TODO: Replace this with your actual crawling logic
  // For now, we'll just return the URL as is
  return url;
}

crawlUrl(urlToCrawl)
  .then(result => {
    // Send the result back to the main thread
    parentPort.postMessage(result);
  })
  .catch(err => {
    // If an error occurred, send the error message back to the main thread
    parentPort.postMessage({ error: err.message });
  })
  .finally(() => {
    // Close the WebDriver
    driver.close();
  });
