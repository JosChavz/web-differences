import { parentPort, workerData } from 'worker_threads';
import { Navigator, Result } from './Navigator';

// Convert the workerData.pagesToNavigate to a URL[]
const pagesToNavigate: URL[] = workerData.pagesToNavigate.map(
  (page: string) => new URL(page)
);

const navigator: Navigator = new Navigator(
  workerData.yaml_doc,
  pagesToNavigate,
  workerData.extraConfig
);

navigator
  .run()
  .then((result: Result) => {
    if (parentPort === null) {
      throw new Error('Parent port is not available');
    }

    // Send the result back to the main thread
    parentPort.postMessage(result);
  })
  .catch(err => {
    if (parentPort === null) {
      throw new Error('Parent port is not available');
    }
    // If an error occurred, send the error message back to the main thread
    parentPort.postMessage({ error: err.message });
  });
