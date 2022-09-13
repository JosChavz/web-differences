# Web Differences
Mainly used for testing the website after doing plugin updates.

## Installation

```bash
npm install
```

## Usage
`./imgdiff.sh`

## Visual Testing
Visual Testing is a program that iterates through the links in "URL.csv" and compares the screenshots of the links to 
the screenshots in the "screenshots" folder. If the screenshots are different, the program will output the differences 
in the "diff" folder.

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

#### Options
*None, but coming soon...*