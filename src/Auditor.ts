import {PNG} from "pngjs";
import fs from "fs-extra";
import pixelmatch from "pixelmatch";
import path from "path";
import winston, {Logger} from "winston";
import sharp from "sharp";

export class Auditor {
  private logger: Logger;

  constructor() {
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({filename: 'logs/auditor.log'}),
      ],
    });
  }

  async compareImages(origin: string, destination: string) {
    // Read the images
    let originImage = PNG.sync.read(fs.readFileSync(origin));
    let destinationImage = PNG.sync.read(fs.readFileSync(destination));
    const {width} = originImage;

    // Determine the new height, which is the minimum height of the two images
    const newHeight = Math.min(originImage.height, destinationImage.height);

    // Crop both images to the new height from the top
    const croppedOrigin = await sharp(fs.readFileSync(origin))
      .extract({ left: 0, top: 0, width: originImage.width, height: newHeight }) // cropping
      .toBuffer();
    originImage = PNG.sync.read(croppedOrigin);

    const croppedDestination = await sharp(fs.readFileSync(destination))
      .extract({ left: 0, top: 0, width: destinationImage.width, height: newHeight }) // cropping
      .toBuffer();
    destinationImage = PNG.sync.read(croppedDestination);

    const diff = new PNG({ width, height: newHeight });
    const numDiffPixels = pixelmatch(originImage.data, destinationImage.data, diff.data, width, newHeight, { threshold: 0.85 });

    if (numDiffPixels > 0) {
      this.logger.error(`Images differ by ${numDiffPixels} pixels.`);
      fs.writeFileSync(`images/diff/${origin.substring(origin.lastIndexOf('/') + 1)}`, PNG.sync.write(diff));
    }
  }
}
