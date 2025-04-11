import { UserError } from "../types/admin.types";

export class UserErrorsException extends Error {
  errors: UserError[] = [];

  constructor(errors: UserError[] = []) {
    super('One or more user errors occurred.');
    
    this.name = 'UserErrorsException';
    this.errors = errors;
  }
}