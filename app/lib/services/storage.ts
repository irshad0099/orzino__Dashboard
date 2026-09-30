/** Thrown by the API client below; UI code shows `error.message` and reads `.fields` for form errors. */
export class ServiceError extends Error {
  code: string;
  fields?: Record<string, string>;
  constructor(code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.fields = fields;
  }
}
