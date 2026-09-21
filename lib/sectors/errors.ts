export class DataError extends Error {
  constructor(
    public readonly code:
      | "configuration"
      | "credentials"
      | "unavailable"
      | "schema"
      | "no_snapshot",
    message: string,
  ) {
    super(message);
    this.name = "DataError";
  }
}
