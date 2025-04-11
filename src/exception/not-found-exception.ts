/**
 * Exception triggered when a find operation does not return any results.
 */
export class NotFoundException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundException';
  }
}