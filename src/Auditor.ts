import { PNG } from 'pngjs';
import fs from 'fs-extra';
import pixelmatch from 'pixelmatch';
import path from 'path';
import winston, { Logger } from 'winston';
import sharp from 'sharp';

export class Auditor {
  private logger: Logger;

  constructor() {
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/auditor.log' }),
      ],
    });
  }

  async compareImages(origin: string, destination: string): Promise<boolean> {
    // Read the images
    let originImage = PNG.sync.read(fs.readFileSync(origin));
    let destinationImage = PNG.sync.read(fs.readFileSync(destination));
    const { width } = originImage;

    // Determine the new height, which is the minimum height of the two images
    const newHeight = Math.min(originImage.height, destinationImage.height);

    // Crop both images to the new height from the top
    const croppedOrigin = await sharp(fs.readFileSync(origin))
      .extract({ left: 0, top: 0, width: originImage.width, height: newHeight }) // cropping
      .toBuffer();
    originImage = PNG.sync.read(croppedOrigin);

    const croppedDestination = await sharp(fs.readFileSync(destination))
      .extract({
        left: 0,
        top: 0,
        width: destinationImage.width,
        height: newHeight,
      }) // cropping
      .toBuffer();
    destinationImage = PNG.sync.read(croppedDestination);

    const diff = new PNG({ width, height: newHeight });
    const numDiffPixels = pixelmatch(
      originImage.data,
      destinationImage.data,
      diff.data,
      width,
      newHeight,
      { threshold: 0.95 }
    );

    if (numDiffPixels > 0) {
      this.logger.error(`Images differ by ${numDiffPixels} pixels.`);

      // Converts PNG to JPG and saves it into the diff folder asynchronously
      sharp(diff.data, { raw: { width, height: newHeight, channels: 4 } })
        .toFormat('jpeg')
        .jpeg({ quality: 80 })
        .toBuffer()
        .then((data: Buffer) => {
          const filename = `${origin.substring(origin.lastIndexOf('/') + 1)}`;
          const filenameDiffExt = filename.substring(
            0,
            filename.lastIndexOf('.')
          );
          const diffPath = path.join(
            'images/diff/',
            filenameDiffExt + '_diff.jpg'
          );
          fs.writeFileSync(diffPath, data);
          this.logger.info(`Diff image saved at: ${diffPath}`);
        });

      return false;
    }

    return true;
  }
}
