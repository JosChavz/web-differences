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
}

// Reads the configuration file
let yaml_doc: Config;

try {
  yaml_doc = yaml.load(fs.readFileSync('config.yml', 'utf8')) as Config;
} catch (e) {
  logger.error(`Error reading the configuration file: ${e}`);
  process.exit(1);
}

const validOrigin = validateLink(yaml_doc.origin);
const validDestination = validateLink(yaml_doc.destination);
if (!validOrigin || !validDestination) {
  logger.error('Invalid URL');
  throw new Error('Invalid URL');
}

// Main function
async function main(): Promise<void> {
  logger.info('Starting the main function');

  const crawler: Crawler = new Crawler(new URL(yaml_doc.origin));
  const pagesToNavigate: URL[] = await crawler.crawl();

  await fs.outputFile('crawled.txt', pagesToNavigate.join('\n'));

  // const navigator: Navigator = new Navigator(yaml_doc);
  // await navigator.run();
}

main()
  .then(() => {
    logger.info('Main function finished');
  })
  .catch(e => {
    logger.error(`Error in the main function: ${e}`);
  });
