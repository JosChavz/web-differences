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

  constructor(browserType: Browser, cookies: Cookies[]) {
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/webdriver.log' }),
      ],
    });

    const tempDriver = this.initializeWebDriver(browserType, cookies);
    if (!tempDriver) {
      throw new Error('Driver is not initialized');
    }
    this.driver = tempDriver;
  }

  initializeWebDriver(
    browserType: Browser,
    cookies: Cookies[]
  ): ThenableWebDriver | undefined {
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

    this.setCookies(cookies).then(() => {
      this.logger.info('Cookies set');
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
