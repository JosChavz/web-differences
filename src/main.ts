import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';
import { Navigator } from './Navigator';
import { Crawler } from './Crawler';
import { validateLink } from './utils';
import { Cookies } from './WebDriver';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
// Initially creates a logger with two transports: Console and File
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export interface Config {
  origin: string;
  destination: string;
  cookies: Cookies[];
  blacklistSinglePaths: string[];
  blacklistChildrenPaths: string[];
}

// Reads the configuration file
let yaml_doc: Config;

// Reads the crawled pages from the cache
let pagesToNavigate: string[] = [];

// Reads the cookies
const cookies: Cookies[] = [];

// Amount of cores to use
const CORES: number = 8;

try {
  yaml_doc = yaml.load(fs.readFileSync('config.yml', 'utf8')) as Config;
} catch (e) {
  logger.error(`Error reading the configuration file: ${e}`);
  process.exit(1);
}

const validOrigin = validateLink(yaml_doc.origin);
const validDestination = validateLink(yaml_doc.destination);
if (!validOrigin || !validDestination) {
  logger.error('Invalid URL in YAML');
  throw new Error('Invalid URL in YAML');
}

try {
  const originURL: URL = new URL(yaml_doc.origin);

  pagesToNavigate = JSON.parse(
    fs.readFileSync(`cache/${originURL.hostname}_crawled.json`, 'utf8')
  );
} catch (e) {
  logger.info(`Error reading the cache: ${e}`);
}

// Creates the folders if not made
if (!fs.existsSync('images/destination')) {
  fs.mkdirSync('images/destination', { recursive: true });
}
if (!fs.existsSync('images/origin')) {
  fs.mkdirSync('images/origin', { recursive: true });
}
if (!fs.existsSync('images/diff')) {
  fs.mkdirSync('images/diff', { recursive: true });
}
if (!fs.existsSync('cache')) {
  fs.mkdirSync('cache', { recursive: true });
}

// Reads the cookies from the YAML file
if (yaml_doc.cookies) {
  yaml_doc.cookies.forEach(cookie => {
    cookies.push(cookie);
  });
}

// Main function
async function main(): Promise<void> {
  logger.info('Starting the main function');

  if (pagesToNavigate.length === 0) {
    const originURL: URL = new URL(yaml_doc.origin);

    const crawler: Crawler = new Crawler(
      originURL,
      {
        singlePaths: yaml_doc.blacklistSinglePaths,
        childrenPaths: yaml_doc.blacklistChildrenPaths,
      },
      cookies
    );
    pagesToNavigate = await crawler.crawl();

    logger.info('Crawling finished! Adding it to cache...');

    await fs.outputFile(
      `cache/${originURL.hostname}_crawled.json`,
      JSON.stringify(pagesToNavigate, null, 2)
    );
  } else {
    logger.info(
      `Using the ${new URL(yaml_doc.origin).hostname}_crawled.json for the crawled pages`
    );
  }

  // TODO: Split the pagesToNavigate array into chunks
  const chunkSize: number = Math.ceil(pagesToNavigate.length / CORES);
  const pageChunks: Array<string[]> = new Array<string[]>(chunkSize);

  let start: number = 0;
  for (let i = 1; i <= CORES; i++) {
    if (i === CORES) {
      pageChunks[i] = pagesToNavigate.slice(start);
    } else {
      pageChunks[i] = pagesToNavigate.slice(start, start + chunkSize);
    }

    start += chunkSize;
  }

  const workers: Promise<Worker>[] = [];
  pageChunks.forEach((chunk: string[]) => {
    const promise: Promise<Worker> = new Promise((resolve, reject) => {
      const worker: Worker = new Worker(
        path.resolve(__dirname, 'navigator_worker.js'),
        {
          workerData: {
            yaml_doc: yaml_doc,
            pagesToNavigate: chunk,
          },
        }
      );
      worker.on('message', message => {
        logger.info('Worker message:', message);
      });
      worker.on('error', e => {
        logger.error(`Worker error: ${e}`);
      });
      worker.on('exit', code => {
        if (code !== 0) logger.error(`Worker stopped with exit code ${code}`);
        reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });
    workers.push(promise);
  });

  if (isMainThread) {
    logger.info('Main thread started');
    await Promise.all(workers);
  } else {
    logger.info('Worker thread started');
  }
}

main()
  .then(() => {
    logger.info('Main function finished');
  })
  .catch(e => {
    logger.error(`Error in the main function: ${e}`);
  });
