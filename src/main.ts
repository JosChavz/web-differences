import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';
import winston from 'winston';
import { Navigator } from './Navigator';

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

try {
  // Validates the URL for both dest and origin
  validateLink(yaml_doc.origin);
  validateLink(yaml_doc.destination);
} catch (e) {
  logger.error(`Error validating the URL: ${e}`);
  process.exit(1);
}

// Main function
async function main(): Promise<void> {
  logger.info('Starting the main function');
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

/***********************************************************************************************
 * FUNCTIONS
 **********************************************************************************************/

function validateLink(link: string): void {
  logger.info('Validating link: ' + link);
  const regex = new RegExp(
    "^(http|https)://[a-zA-Z0-9-.]+.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?/?([a-zA-Z0-9-._?,'/\\+&amp;%$#=~])*[^.,)(s]$"
  );
  const valid = regex.test(link);
  if (!valid) throw new Error(`Invalid URL ${link}`);

  return;
}
