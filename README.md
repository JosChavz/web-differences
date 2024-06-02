# Web Differences

Mainly used for WordPress sites to test after a plugin update. Currently working by having a dev/staging site and production site. The program will take screenshots of the pages and compare them to see if there are any differences. If there are differences, the program will output the differences in the "diff" folder.

## Installation

Make sure to have Docker installed and running

```bash
npm install
```

### Requirements
- Node.js : v20


## Getting Started

After installing all the required packages,
please copy the "config.yml.temp" file to "config.yml" in the same directory. 
Set the origin and destination of the pages.
Ensure to have the HTTP protocol in the URL, plus the subdomain, IF USED, and domain.
*(e.g. http://subdomain.domain.com)*

Please copy the ".env.temp" file to ".env" in the same directory.
Given that multithreading is supported, please set the number of threads you would like to use in halves.

The reason behind it is due to [Selenium Grid](https://github.com/SeleniumHQ/docker-selenium?tab=readme-ov-file#increasing-session-concurrency-per-container) configuration for concurrency. 
Sadly, one webdriver will use one CPU core, so it is best to use half of the CPU cores available.


## Usage

After installing all the required packages, run the following command:

```bash
make all
```

This will create the necessary Docker containers and network that will be used for the Node.js program.

After that,
```bash
npm run build
npm run start
```

Given that the `config.yaml` file is set up correctly, the program will start running.

## Visual Testing
Visual Testing is a program that iterates through the pages of the ORIGIN websites. 
The program will take screenshots of the pages and compare them to see if there are any differences. 
If there are differences, the program will output the differences in the "diff" folder, 
and log the differences in the "logs" folder.

### How it Works
The program uses the "pixelmatch" library to compare the screenshots. The program will output the differences in the 
"diff" folder. During runtime, the program compares both images from the same URL and checks to see if there are any
differences. The program will output all images in a designated "origin" and "dest" folder temporarily. If there are any differences, the program will output the differences in the "diff" folder.

Please note that small changes such as animations may cause a false-positive.

Where each new cookie will be joined by a "-"  <br>
*As for now, only name and value are accepted. Please use quotation marks at all times. Failure to do so will result in a program **crash**!*
- Lastly, in the "config.yml" file, change the "origin" and "destination". Please include full URL links.
- Any single paths or parent paths (will not include the parent page itself) to be ignored, please add it to the "config.yml" 
file as, in respect, `blacklistSinglePaths` or `blacklistChildrenPaths`.

***Please follow the syntax of config.yml and .env***

## Logging

There will be a log to ensure that the program is running correctly. The log will be in the "logs" folder. The log will also be printed out on the console.

## Architecture

There are three essential files:
- Auditor.ts
- Navigator.ts
- Photographer.ts
- Crawler.ts

These files will be run in the `main.ts` file. The main file is only responsible for
parsing the YAML configuration file and running the Navigator class.

### Crawler.ts
As the name implies, the Crawler will crawl through the pages of the website. 
It will be using the *"selenium-webdriver"* library to crawl through. 
The Crawler will be responsible for finding all the URLs of the website to then pass it into the
Navigator class.
However, before passing it to the Navigator class,
all links that were crawled will be saved into a JSON file inside of `cache`.

### Auditor.ts

The Auditor class is responsible for comparing the screenshots of the origin and destination. It will be reporting the differences, whether they pass or fail. The Auditor class will be using the *"pixelmatch"* library to compare the images.

[TODO: An elaborate page where the Auditor reports the differences]

### Navigator.ts

The Navigator class is responsible for navigating through the pages of both ORIGIN and DESTINATION, 
it is truly the main file among these other files. 
It will be using the *"selenium-webdriver"* library to navigate through the pages.

**Note**: The Navigator class will use ORIGIN as the main source to navigate through the website. This means, if there are any pages that are not in the ORIGIN website, the program will not be able to navigate to that page.

After navigating to another page, it will call the Photographer class to take a screenshot of the page. Then, it will call the Auditor class to compare the screenshots.

### Photographer.ts

The Photographer class is responsible for taking the screenshots of the pages. It will be using the *"selenium-webdriver"* library to take the screenshots.

[FUTURE: The Photographer class will be able to take full screenshots of the page in different resolutions. This is to ensure that all devices are covered.]

## Future Implementations

- [x] Implement a caching system to reduce the time of the program
- [x] Implement multi-threading to increase the speed of the program
- [ ] Implement a full screenshot of the page for different dimensions
- [ ] Implement a visual report of the differences
- [x] Leverage off Docker to run the program with the respected Chrome version
- [x] Create different Docker containers for other browsers

## Issues

If there are any issues, please create an issue in the repository.

Here are some that I have seen:

- The program will not work if the ORIGIN website has a different structure.

  For example, if the ORIGIN is `http://subdomain.domain.com` but the actual website is `http://domain.com`, 
the program will not work.

- If trying to compare a gallery page, the program will not work.

  Mostly due to having so many pages to load.

- There are times when minor differences will cause a false-positive.

  For example, if there is an animation on the page, the program will detect it as a difference. 
Even Google Maps will cause a false-positive.

