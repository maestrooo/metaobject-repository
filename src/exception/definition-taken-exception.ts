export class DefinitionTakenException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DefinitionTakenException';
  }
}