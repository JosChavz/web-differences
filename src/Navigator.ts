import { Config } from './main';
import { URL } from 'url';
import fs from 'fs-extra';
import winston, { Logger } from 'winston';
import { Browser, Cookies, WebDriver } from './WebDriver';
import { Photographer } from './Photographer';
import { Auditor } from './Auditor';

export interface Result {
  diffCount: number;
  errorURLs: string[];
}

export class Navigator {
  readonly config: Config;
  readonly ORIGIN_BASE_URL: string;
  readonly DESTINATION_BASE_URL: string;
  queue: URL[] = [];
  readonly logger: Logger;
  readonly cookies: Cookies[];
  diffCount: number = 0;
  errorURLs: string[] = [];

  constructor(configParams: Config, pageQueue: URL[] = []) {
    this.config = configParams;
    this.ORIGIN_BASE_URL = configParams.origin;
    this.DESTINATION_BASE_URL = configParams.destination;
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/navigator.log' }),
      ],
    });

    this.queue.push(...pageQueue);
    this.cookies = configParams.cookies;
  }

  async run(): Promise<Result> {
    const originDriver: WebDriver = new WebDriver(Browser.CHROME, this.cookies);
    const destinationDriver: WebDriver = new WebDriver(
      Browser.CHROME,
      this.cookies
    );

    const originPhotographer: Photographer = new Photographer(
      originDriver,
      'origin'
    );
    const destinationPhotographer: Photographer = new Photographer(
      destinationDriver,
      'destination'
    );

    const auditor: Auditor = new Auditor();

    do {
      // The two URLs to compare
      const currentOriginURL: URL = this.queue.shift() as URL;
      const currentDestinationURL: URL = new URL(
        currentOriginURL.href.replace(
          this.ORIGIN_BASE_URL,
          this.DESTINATION_BASE_URL
        )
      );

      // Visit the URLs
      try {
        await originDriver.visitURL(currentOriginURL, {
          fullHeight: true,
        });
        await destinationDriver.visitURL(currentDestinationURL, {
          fullHeight: true,
        });
      } catch (e) {
        this.logger.error(`Error visiting URL: ${e}`);
        this.errorURLs.push(currentOriginURL.toString());
        continue;
      }

      // Takes a full screenshot
      const originScreenshotPath: string =
        await originPhotographer.takeFullScreenshot();
      const destinationScreenshotPath: string =
        await destinationPhotographer.takeFullScreenshot();

      // Compare the two screenshots asynchronously
      auditor
        .compareImages(originScreenshotPath, destinationScreenshotPath)
        .then(result => {
          if (result) {
            this.diffCount++;
          }
        })
        .catch(e => {
          this.logger.error(
            `Error comparing images for URL ${currentOriginURL}: ${e}`
          );
          this.errorURLs.push(currentOriginURL.toString());
        })
        .finally(() => {
          fs.remove(originScreenshotPath);
          fs.remove(destinationScreenshotPath);
        });

      this.logger.info(
        `Finished comparing ${currentOriginURL}. Remaining: ${this.queue.length}`
      );
    } while (this.queue.length > 0);

    await originDriver.close();
    await destinationDriver.close();

    return {
      diffCount: this.diffCount,
      errorURLs: this.errorURLs,
    };
  }
}
