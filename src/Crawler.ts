import { URL } from 'url';
import winston, { Logger } from 'winston';

export class Crawler {
  queue: URL[] = [];
  visited: Set<URL> = new Set();
  readonly logger: Logger;

  constructor() {
    this.queue = [];
    this.visited = new Set();
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/crawler.log' }),
      ],
    });
  }
}
