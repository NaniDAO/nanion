export class TimeRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeRangeError";
  }
}
