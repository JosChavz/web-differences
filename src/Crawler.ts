import { URL } from 'url';
import winston, { Logger } from 'winston';
import { Browser, WebDriver } from './WebDriver';

export class Crawler {
  queue: URL[] = [];
  visited: Set<URL> = new Set();
  readonly logger: Logger;
  readonly initialURL: URL;
  readonly driver: WebDriver;

  constructor(initURL: URL) {
    this.initialURL = initURL;
    this.queue = [];
    this.visited = new Set();
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/crawler.log' }),
      ],
    });
    this.driver = new WebDriver(Browser.CHROME);
  }

  async crawl(): Promise<URL[]> {
    const pagesToNavigate: URL[] = [];

    this.queue.push(this.initialURL);
    do {
      const currentURL: URL = this.queue.shift() as URL;
      const visitedURL: URL = await this.driver.visitURL(currentURL);

      this.logger.info(
        `Has visited? ${this.visited.has(visitedURL)} URL: ${visitedURL} - ${currentURL} ${this.visited.has(currentURL)}`
      );

      if (this.visited.has(visitedURL) || this.visited.has(currentURL)) {
        this.logger.info(
          `The destination URL ${visitedURL} has already been visited. URL from Stack: ${currentURL}\n Skipping...`
        );
        continue;
      }

      // Unique URLs section
      this.visited.add(currentURL);
      this.visited.add(visitedURL);
      pagesToNavigate.push(currentURL);

      const links: URL[] = await this.driver.getAllLinks();
      const filteredLinks: URL[] = await this.filterLinks(links);

      this.logger.info(
        `Found ${filteredLinks.length} new links on ${currentURL}`
      );

      this.queue.push(...filteredLinks);
    } while (this.queue.length > 0);

    await this.driver.close();

    return pagesToNavigate;
  }

  private async filterLinks(links: URL[]): Promise<URL[]> {
    return links.filter(link => {
      // Filter out the visited links
      if (this.visited.has(link)) {
        return false;
      }
      // Filter out the links that are already in the queue
      if (this.queue.includes(link)) {
        return false;
      }
      // Filter out the links that are not in the same domain
      return link.hostname === this.initialURL.hostname;
    });
  }
}
