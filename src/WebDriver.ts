import winston from 'winston';
import chrome from 'selenium-webdriver/chrome';
import firefox from 'selenium-webdriver/firefox';
import edge from 'selenium-webdriver/edge';
import webdriver, {
  By,
  ThenableWebDriver,
  WebElement,
} from 'selenium-webdriver';
import fs from 'fs-extra';
import path from 'path';
import { validateLink } from './utils';

export enum Browser {
  EDGE = 'EDGE',
  CHROME = 'CHROME',
  FIREFOX = 'FIREFOX',
}

export enum DEVICE_WIDTH {
  DESKTOP = 1920,
  TABLET = 768,
  MOBILE = 375,
}

export interface Cookies {
  name: string;
  value: string;
}

export class WebDriver {
  readonly logger: winston.Logger;
  readonly driver: ThenableWebDriver;
  readonly FILENAME: string = path.basename(__filename);
  readonly cookies: Cookies[];
  cookiesInitialized: boolean = false;

  constructor(browserType: Browser, cookies: Cookies[]) {
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/webdriver.log' }),
      ],
    });
    this.cookies = cookies;

    const tempDriver = this.initializeWebDriver(browserType);
    if (!tempDriver) {
      throw new Error('Driver is not initialized');
    }
    this.driver = tempDriver;

    if (!this.driver) {
      throw new Error('Driver is not initialized');
    }
  }

  initializeWebDriver(browserType: Browser): ThenableWebDriver | undefined {
    this.logger.info('Initializing the WebDriver');

    // Temporary driver
    let tempDriver: ThenableWebDriver | undefined = undefined;

    // Options
    const chromeOptions: chrome.Options = new chrome.Options();
    const firefoxOptions: firefox.Options = new firefox.Options();
    const edgeOptions: edge.Options = new edge.Options();

    switch (browserType) {
      case Browser.EDGE:
        edgeOptions.addArguments('--headless');
        edgeOptions.addArguments('--window-size=1920,1080');
        edgeOptions.addArguments('--no-sandbox');
        edgeOptions.addArguments('--disable-gpu');
        edgeOptions.addArguments('--disable-extensions');
        edgeOptions.addArguments('--disable-popup-blocking');

        tempDriver = new webdriver.Builder()
          .forBrowser(webdriver.Browser.EDGE)
          .usingServer('http://localhost:4444/')
          .setEdgeOptions(edgeOptions)
          .build();
        break;
      case Browser.CHROME:
        chromeOptions.addArguments('--headless');
        chromeOptions.addArguments('--window-size=1920,1080');
        chromeOptions.addArguments('--no-sandbox');
        chromeOptions.addArguments('--disable-gpu');
        chromeOptions.addArguments('--disable-extensions');
        chromeOptions.addArguments('--disable-popup-blocking');

        tempDriver = new webdriver.Builder()
          .forBrowser(webdriver.Browser.CHROME)
          .usingServer('http://localhost:4444/')
          .setChromeOptions(chromeOptions)
          .build();
        break;
      case Browser.FIREFOX:
        firefoxOptions.addArguments('--headless');
        firefoxOptions.addArguments('--window-size=1920,1080');
        firefoxOptions.addArguments('--no-sandbox');
        firefoxOptions.addArguments('--disable-gpu');
        firefoxOptions.addArguments('--disable-extensions');
        firefoxOptions.addArguments('--disable-popup-blocking');

        tempDriver = new webdriver.Builder()
          .forBrowser(webdriver.Browser.FIREFOX)
          .usingServer('http://localhost:4444/')
          .setFirefoxOptions(firefoxOptions)
          .build();
        break;
      default:
        throw new Error('Unsupported browser type');
    }

    tempDriver?.manage().setTimeouts({
      implicit: 100000,
    });

    return tempDriver;
  }

  async visitURL(
    url: URL,
    options?: {
      fullHeight: boolean;
      width?: DEVICE_WIDTH;
    }
  ) {
    this.logger.info(`Visiting the URL: ${url.toString()}`);

    await this.driver.get(url.toString());

    if (!this.cookiesInitialized) {
      this.logger.info('Setting the cookies for the first time!');
      await this.setCookies(this.cookies);
      this.cookiesInitialized = true;

      // Refresh the page to apply the cookies
      await this.driver.navigate().refresh();
    }

    if (options?.fullHeight) {
      const totalHeight: number = await this.driver.executeScript(
        'return document.body.parentNode.scrollHeight'
      );

      await this.driver
        .manage()
        .window()
        .setRect({
          width: options.width || DEVICE_WIDTH.DESKTOP,
          height: totalHeight,
        });
    }

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

  async takeFullScreenshot(directoryPath: string): Promise<string> {
    this.logger.info(this.logMessage('Taking a full screenshot'));

    const screenshotPath: string = path.join(
      directoryPath,
      `${Date.now()}.png`
    );

    await this.driver.takeScreenshot().then(async (data: string) => {
      await fs.outputFile(screenshotPath, data, 'base64');
      this.logger.info(
        this.logMessage(`Screenshot saved at: ${screenshotPath}`)
      );
    });

    return screenshotPath;
  }

  async setCookies(cookies: { name: string; value: string }[]): Promise<void> {
    this.logger.info(this.logMessage('Setting cookies'));

    await Promise.all(
      cookies.map(async cookie => {
        await this.driver.manage().addCookie(cookie);
      })
    );
  }

  private logMessage(message: string) {
    return `${this.FILENAME} - ${message}`;
  }

  async close() {
    this.logger.info('Closing the WebDriver');
    await this.driver.quit();
  }
}
