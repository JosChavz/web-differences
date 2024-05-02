# Web Differences

Mainly used for WordPress sites to test after a plugin update. Currently working by having a dev/staging site and production site. The program will take screenshots of the pages and compare them to see if there are any differences. If there are differences, the program will output the differences in the "diff" folder.

## Installation

```bash
npm install
```

## Getting Started

After installing all the required packages,
please copy the "config.yml.temp" file to "config.yml" in the same directory. 
Set the origin and destination of the pages.
Ensure to have the HTTP protocol in the URL, plus the subdomain and domain.
*(e.g. http://subdomain.domain.com)*


## Usage

[TODO: Add the usage of the program]

## Visual Testing
Visual Testing is a program that iterates through the pages of the ORIGIN websites. 
The program will take screenshots of the pages and compare them to see if there are any differences. 
If there are differences, the program will output the differences in the "diff" folder, 
and log the differences in the "logs" folder.

### How it Works
The program uses the "pixelmatch" library to compare the screenshots. The program will output the differences in the 
"diff" folder. During runtime, the program compares both images from the same URL and checks to see if there are any
differences. The program will output all images in a designated "origin" and "dest" folder. <br>
In the case that there are differences, the name will reflect the page name and the screenshot. Unfortunately, for
the time being, full screenshots of a page is not supported. Therefore, the program will only take a screenshot of
the first visible part of the page and scroll down to the bottom of the page. 

There are a couple of requirements prior running the visual tests. Enter the "visual-testing" folder.
- Firstly, run `chmod +x imgdiff.sh`
  - If packages are not installed, then this will install the packages
- Optionally, if you have any custom cookies to add in, then add them into the "config.yml" file structured as:
```yaml
cookie:
  - name: "pum-298945"
    value: "true"
```
Where each new cookie will be joined by a "-"  <br>
*As for now, only name and value are accepted. Please use quotation marks at all times. Failure to do so will result in a program **crash**!*
- Lastly, in the "config.yml" file, change the "origin" and "destination". Please include full URL links.
- Any single paths or parent paths (will not include the parent page itself) to be ignored, please add it to the "config.yml" 
file as, in respect, `blacklistSinglePaths` or `blacklistChildrenPaths`.

***Please follow the syntax of config.yml***

## Logging

There will be a log to ensure that the program is running correctly. The log will be in the "logs" folder. The log will also be printed out on the console.

## Architecture

There are three essential files:
- Auditor.ts
- Navigator.ts
- Photographer.ts

These files will be run in the `main.ts` file. The main file is only responsible for
parsing the YAML configuration file and running the Navigator class.

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
