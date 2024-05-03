import winston from 'winston';
import path from 'path';

// Custom formatter that extracts and appends file and line number
const fileInfoFormat = winston.format(info => {
  // Temporarily override the Error.prepareStackTrace function to capture the stack as an array of call sites
  const oldPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const err = new Error();
  const stack = err.stack; // Capture the stack trace as an array
  Error.prepareStackTrace = oldPrepareStackTrace;

  // Ensure the stack is treated as an array and find the first relevant stack entry
  const relevantStack = Array.isArray(stack)
    ? stack.find(s => {
        const fileName = s.getFileName() || '';
        return !fileName.includes('logger.js') && !fileName.includes('winston');
      })
    : null;

  if (relevantStack) {
    info.filename = path.basename(relevantStack.getFileName());
    info.line = relevantStack.getLineNumber();
  }

  return info;
});

// Combine formats
export const myFormat = winston.format.combine(
  fileInfoFormat(),
  winston.format.timestamp(),
  winston.format.printf(
    info =>
      `${info.timestamp} [${info.level}] ${info.filename}:${info.line} - ${info.message}`
  )
);

export function validateLink(link: string): boolean {
  const regex = new RegExp(
    "^(http|https)://[a-zA-Z0-9-.]+.[a-zA-Z]{2,3}(:[a-zA-Z0-9]*)?/?([a-zA-Z0-9-._?,'/+&amp;%$#=~])*[^.,)(s]$"
  );
  return regex.test(link);
}
