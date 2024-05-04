import winston from 'winston';
import chrome from 'selenium-webdriver/chrome';
import webdriver, {
  By,
  ThenableWebDriver,
  WebElement,
} from 'selenium-webdriver';
import fs from 'fs-extra';
import path from 'path';
import { validateLink } from './utils';

export enum Browser {
  IE = 'IE',
  EDGE = 'EDGE',
  CHROME = 'CHROME',
  FIREFOX = 'FIREFOX',
}

export class WebDriver {
  readonly logger: winston.Logger;
  readonly driver: ThenableWebDriver;
  readonly FILENAME: string = path.basename(__filename);

  constructor(browserType: Browser) {
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/webdriver.log' }),
      ],
    });

    const tempDriver = this.initializeWebDriver(browserType);
    if (!tempDriver) {
      throw new Error('Driver is not initialized');
    }
    this.driver = tempDriver;
  }

  initializeWebDriver(browserType: Browser): ThenableWebDriver | undefined {
    this.logger.info('Initializing the WebDriver');

    // Temporary driver
    let tempDriver: ThenableWebDriver | undefined = undefined;

    // Options
    const chromeOptions: chrome.Options = new chrome.Options();

    switch (browserType) {
      case Browser.IE:
        // this.driver = new IEDriver();
        break;
      case Browser.EDGE:
        // this.driver = new EdgeDriver();
        break;
      case Browser.CHROME:
        chromeOptions.addArguments('--headless');
        chromeOptions.addArguments('--disable-gpu');
        chromeOptions.addArguments('--window-size=1920,1080');
        chromeOptions.addArguments('--no-sandbox');

        tempDriver = new webdriver.Builder()
          .forBrowser(webdriver.Browser.CHROME)
          .setChromeOptions(chromeOptions)
          .build();
        break;
      case Browser.FIREFOX:
        // this.driver = new FirefoxDriver();
        break;
      default:
        throw new Error('Unsupported browser type');
    }

    return tempDriver;
  }
  async visitURL(url: URL) {
    this.logger.info(`Visiting the URL: ${url.toString()}`);

    await this.driver.get(url.toString());
    await this.waitForLoad();

    const currentURL: string = await this.driver.getCurrentUrl();

    this.logger.info(`Current URL: ${currentURL}`);

    return new URL(currentURL);
  }

  private async waitForLoad() {
    await this.driver.wait(async () => {
      const readyState = await this.driver.executeScript(
        'return document.readyState'
      );
      return readyState === 'complete';
    });
  }

  async getAllLinks(maxTries: number = 5): Promise<URL[]> {
    this.logger.info(
      this.logMessage(`Getting all the links on the page - try ${maxTries}`)
    );

    let links: URL[] = [];

    try {
      const anchorElements: WebElement[] = await this.driver.findElements(
        By.css('a')
      );

      links = await Promise.all(
        anchorElements.map(async anchorElement => {
          const href = await anchorElement.getAttribute('href');
          if (!href || !validateLink(href)) {
            return null;
          }
          return new URL(href);
        })
      ).then(links => links.filter(link => link !== null) as URL[]);
    } catch (e) {
      this.logger.error(this.logMessage(`Error getting the links: ${e}`));
      if (maxTries > 0) {
        this.logger.info(
          this.logMessage(`Retrying to get the links - ${maxTries} left`)
        );
        links = await this.getAllLinks(maxTries - 1);
      }
    }

    return links;
  }

  private logMessage(message: string) {
    return `${this.FILENAME} - ${message}`;
  }

  async close() {
    this.logger.info('Closing the WebDriver');
    await this.driver.quit();
  }
}
