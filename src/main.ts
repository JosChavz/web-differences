import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';
import { Navigator } from './Navigator';
import { Crawler } from './Crawler';
import { validateLink } from './utils';
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
  blacklistSinglePaths: string[];
  blacklistChildrenPaths: string[];
}

// Reads the configuration file
let yaml_doc: Config;

// Reads the crawled pages from the cache
let pagesToNavigate: URL[] = [];

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
  ) as URL[];
} catch (e) {
  logger.info(`Error reading the cache: ${e}`);
}

// Main function
async function main(): Promise<void> {
  logger.info('Starting the main function');

  if (pagesToNavigate.length === 0) {
    const originURL: URL = new URL(yaml_doc.origin);

    const crawler: Crawler = new Crawler(originURL, {
      singlePaths: yaml_doc.blacklistSinglePaths,
      childrenPaths: yaml_doc.blacklistChildrenPaths,
    });
    const pagesToNavigate: URL[] = await crawler.crawl();

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

  const navigator: Navigator = new Navigator(yaml_doc);
  await navigator.run();
}

main()
  .then(() => {
    logger.info('Main function finished');
  })
  .catch(e => {
    logger.error(`Error in the main function: ${e}`);
  });
