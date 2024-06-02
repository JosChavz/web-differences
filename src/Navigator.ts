import { URL } from 'url';
import fs from 'fs-extra';
import winston, { Logger } from 'winston';
import { WebDriver } from './WebDriver';
import { Photographer } from './Photographer';
import { Auditor } from './Auditor';
import { Browser, Config, Cookies, DEVICE_WIDTH, ExtraOptions } from './types';

export interface Result {
  diffCount: number;
  errorURLs: string[];
}

export class Navigator {
  readonly config: Config;
  readonly ORIGIN_BASE_URL: string;
  readonly DESTINATION_BASE_URL: string;
  readonly logger: Logger;
  readonly cookies: Cookies[];
  readonly device: DEVICE_WIDTH;
  readonly browser: Browser;

  diffCount: number = 0;
  queue: URL[] = [];
  errorURLs: string[] = [];

  constructor(
    configParams: Config,
    pageQueue: URL[] = [],
    extraConfig?: ExtraOptions
  ) {
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/navigator.log' }),
      ],
    });

    this.config = configParams;
    this.ORIGIN_BASE_URL = configParams.origin;
    this.DESTINATION_BASE_URL = configParams.destination;
    this.browser = extraConfig?.browser ?? Browser.CHROME;
    this.device = extraConfig?.deviceWidth ?? DEVICE_WIDTH.DESKTOP;

    this.queue.push(...pageQueue);
    this.cookies = configParams.cookies;
  }

  async run(): Promise<Result> {
    // TODO: Can we just have one driver instead of two?
    const originDriver: WebDriver = new WebDriver(
      this.browser,
      this.cookies,
      this.device
    );
    const destinationDriver: WebDriver = new WebDriver(
      this.browser,
      this.cookies,
      this.device
    );

    await this.navigateQueue(originDriver, destinationDriver);

    try {
      await originDriver.close();
      await destinationDriver.close();
    } catch (e) {
      this.logger.error(`Error closing the drivers: ${e}`);
    }

    return {
      diffCount: this.diffCount,
      errorURLs: this.errorURLs,
    };
  }

  private async navigateQueue(
    originDriver: WebDriver,
    destinationDriver: WebDriver
  ): Promise<void> {
    const auditor: Auditor = new Auditor();

    const originPhotographer: Photographer = new Photographer(
      originDriver,
      'origin'
    );
    const destinationPhotographer: Photographer = new Photographer(
      destinationDriver,
      'destination'
    );

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
          if (!result) {
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
  }
}
