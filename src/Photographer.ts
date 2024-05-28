import { WebDriver } from './WebDriver';

export class Photographer {
  private readonly driver: WebDriver;
  private readonly directoryPath: string;

  constructor(driver: WebDriver, dir: string) {
    this.driver = driver;
    this.directoryPath = `images/${dir}`;
  }

  takeFullScreenshot(): Promise<string> {
    return this.driver.takeFullScreenshot(this.directoryPath);
  }
}
