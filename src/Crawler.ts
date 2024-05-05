import { URL } from 'url';
import winston, { Logger } from 'winston';
import { Browser, WebDriver } from './WebDriver';

export interface Blacklist {
  singlePaths: string[];
  childrenPaths: string[];
}

export class Crawler {
  queue: string[] = [];
  visited: Set<string> = new Set<string>();
  readonly logger: Logger;
  readonly initialURL: URL;
  readonly driver: WebDriver;
  readonly singlePathBlacklist: Set<string> = new Set();
  readonly childrenPathBlacklist: string[];

  constructor(initURL: URL, blacklist: Blacklist) {
    this.initialURL = initURL;
    this.queue = [];
    this.visited = new Set();

    // Initializes the blacklisted sets
    blacklist.singlePaths.forEach(path => {
      const tempURL = new URL(path, this.initialURL);
      this.singlePathBlacklist.add(tempURL.toString());
    });

    this.childrenPathBlacklist = blacklist.childrenPaths.map(path =>
      new URL(path, this.initialURL).toString()
    );

    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/crawler.log' }),
      ],
    });

    this.driver = new WebDriver(Browser.CHROME);
  }

  async crawl(): Promise<URL[]> {
    const pagesToNavigate: string[] = [];
    const initialURL: URL = this.initialURL;

    this.queue.push(initialURL.toString());
    do {
      const currentURLString: string | undefined = this.queue.shift();
      if (!currentURLString) {
        break;
      }
      const currentURL: URL = new URL(currentURLString);

      // Remove queries and fragments
      currentURL.search = '';
      currentURL.hash = '';

      const visitedURL: URL = await this.driver.visitURL(currentURL);

      this.logger.info(
        `Has visited? ${this.visited.has(visitedURL.toString())} URL: ${visitedURL} - ${currentURL} ${this.visited.has(currentURL.toString())}`
      );

      if (
        this.visited.has(visitedURL.toString()) ||
        this.visited.has(currentURL.toString())
      ) {
        this.visited.add(currentURL.toString());
        this.visited.add(visitedURL.toString());
        this.logger.info(
          `The destination URL ${visitedURL} has already been visited. URL from Stack: ${currentURL}\n Skipping...`
        );
        continue;
      }

      // Unique URLs section
      this.visited.add(currentURL.toString());
      this.visited.add(visitedURL.toString());
      pagesToNavigate.push(visitedURL.toString());

      const links: URL[] = await this.driver.getAllLinks();
      const filteredLinks: string[] = await this.filterLinks(links);

      this.logger.info(
        `Found ${filteredLinks.length} new links on ${currentURL}`
      );

      const uniqueLinks: Set<string> = new Set([
        ...this.queue,
        ...filteredLinks,
      ]);

      this.queue = Array.from(uniqueLinks);

      this.logger.info(`Queue size: ${this.queue.length}`);
    } while (this.queue.length > 0);

    await this.driver.close();

    return pagesToNavigate.map(page => new URL(page));
  }

  private async filterLinks(links: URL[]): Promise<string[]> {
    return links
      .filter((link: URL) => {
        // Remove queries and fragments
        link.search = '';
        link.hash = '';

        // Filter out the visited links
        if (this.visited.has(link.toString())) {
          return false;
        }

        // Filter out the links that are already in the queue
        if (this.queue.includes(link.toString())) {
          return false;
        }

        // Filters out the links that are in the blacklist single paths
        if (this.singlePathBlacklist.has(link.toString())) {
          return false;
        }

        // Checks to see the link is in the blacklist children paths
        const isChild: boolean = this.childrenPathBlacklist.some(path => {
          return this.isChildUrl(new URL(path), link);
        });
        if (isChild) {
          return false;
        }

        // Filter out the links that are not in the same domain
        return link.hostname === this.initialURL.hostname;
      })
      .map(link => link.toString());
  }

  private isChildUrl(parentUrl: URL, childUrl: URL) {
    // Normalize paths by ensuring they both end with a '/'
    const parentPath = parentUrl.pathname.endsWith('/')
      ? parentUrl.pathname
      : parentUrl.pathname + '/';
    const childPath = childUrl.pathname.endsWith('/')
      ? childUrl.pathname
      : childUrl.pathname + '/';

    // Check if the child path starts with the parent path
    return childPath.startsWith(parentPath);
  }
}
