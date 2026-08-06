declare module "unzipper" {
  export interface Entry {
    path: string;
    type: "File" | "Directory";
    compressedSize: number;
    uncompressedSize: number;
    flags: number;
    stream(password?: string): NodeJS.ReadableStream;
    buffer(password?: string): Promise<Buffer>;
  }

  export interface CentralDirectory {
    files: Entry[];
  }

  export namespace Open {
    function buffer(input: Buffer): Promise<CentralDirectory>;
  }
}
