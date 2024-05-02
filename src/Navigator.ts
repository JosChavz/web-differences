import { Config } from './main';
import { URL } from 'url';
import fs from 'fs-extra';
import path from 'path';
import webdriver, { By, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import winston, { Logger } from 'winston';

export class Navigator {
  readonly roadmap: Config;
  readonly ORIGIN_BASE_URL: string;
  readonly DESTINATION_BASE_URL: string;
  queue: URL[] = [];
  visited: Set<URL> = new Set();
  readonly logger: Logger;

  constructor(roadmap: Config) {
    this.roadmap = roadmap;
    this.ORIGIN_BASE_URL = roadmap.origin;
    this.DESTINATION_BASE_URL = roadmap.destination;
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/navigator.log' }),
      ],
    });
    this.queue.push(new URL(this.ORIGIN_BASE_URL));
  }

  async run() {
    const originDriver: WebDriver = await this.initializeWebDriver();
    const destinationDriver: WebDriver = await this.initializeWebDriver();

    do {
      // The two URLs to compare
      const currentOriginURL: URL = this.queue.shift() as URL;
      const currentDestinationURL: URL = new URL(
        currentOriginURL.href.replace(
          this.ORIGIN_BASE_URL,
          this.DESTINATION_BASE_URL
        )
      );

      // Visits the origin URL
      const currentOriginVisitedURL: URL = await this.visitURL(
        originDriver,
        currentOriginURL
      );

      // First checks if the destination URL is already visited
      // Adds the origin URL to the visited set - to avoid revisiting
      if (this.visited.has(currentOriginVisitedURL)) {
        this.visited.add(currentOriginURL);
        this.logger.info(
          `The destination URL ${currentOriginVisitedURL} has already been visited. URL from Stack: ${currentOriginURL}\n Skipping...`
        );
        continue;
      }

      // Visits the destination URL
      const currentDestinationVisitedURL = await this.visitURL(
        destinationDriver,
        currentDestinationURL
      );
    } while (this.queue.length > 0);

    await this.closeDriver(originDriver);
  }

  async initializeWebDriver(): Promise<WebDriver> {
    // Creates the Selenium WebDriver
    const options = new chrome.Options();
    options.addArguments('--headless');
    options.addArguments('--disable-gpu');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--no-sandbox');
    const driver = await new webdriver.Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await driver.manage().window().maximize();

    return driver;
  }

  async closeDriver(driver: WebDriver) {
    if (driver) {
      await driver.quit();
    }
  }

  /**
   * Visits the URL and returns the current URL
   * Note that the returned URL may be different from the input URL
   * if a redirect occurs
   * @param driver - The WebDriver
   * @param url - The URL to visit
   * @returns The current URL after visiting the input URL
   */
  async visitURL(driver: WebDriver, url: URL): Promise<URL> {
    await driver.get(url.href);
    return new URL(driver.getCurrentUrl());
  }
}
