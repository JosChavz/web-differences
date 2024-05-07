import { Config } from './main';
import { URL } from 'url';
import fs from 'fs-extra';
import path from 'path';
import chrome from 'selenium-webdriver/chrome';
import winston, { Logger } from 'winston';
import { Browser, Cookies, WebDriver } from './WebDriver';
import { Photographer } from './Photographer';
import { Auditor } from './Auditor';

export class Navigator {
  readonly config: Config;
  readonly ORIGIN_BASE_URL: string;
  readonly DESTINATION_BASE_URL: string;
  queue: URL[] = [];
  readonly logger: Logger;
  readonly cookies: Cookies[];

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

  async run() {
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

      await originDriver.visitURL(currentOriginURL, {
        fullHeight: true,
      });
      await destinationDriver.visitURL(currentDestinationURL, {
        fullHeight: true,
      });

      // Takes a full screenshot
      const originScreenshotPath: string =
        await originPhotographer.takeFullScreenshot();
      const destinationScreenshotPath: string =
        await destinationPhotographer.takeFullScreenshot();

      try {
        // Compare the two screenshots
        await auditor.compareImages(
          originScreenshotPath,
          destinationScreenshotPath
        );
      } catch (e) {
        this.logger.error(
          `Error comparing images for URL ${currentOriginURL}: ${e}`
        );
      } finally {
        // Remove the screenshots
        fs.removeSync(originScreenshotPath);
        fs.removeSync(destinationScreenshotPath);
      }
    } while (this.queue.length > 0);

    await originDriver.close();
    await destinationDriver.close();
  }
}
