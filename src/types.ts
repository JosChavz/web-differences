export enum Browser {
  EDGE = 'edge',
  CHROME = 'chrome',
  FIREFOX = 'firefox',
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

export interface Config {
  origin: string;
  destination: string;
  cookies: Cookies[];
  blacklistSinglePaths: string[];
  blacklistChildrenPaths: string[];
}

export interface ExtraOptions {
  browser: Browser;
  deviceWidth: DEVICE_WIDTH;
}
