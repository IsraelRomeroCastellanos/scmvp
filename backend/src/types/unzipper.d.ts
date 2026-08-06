declare module "unzipper" {
  export interface Entry {
    path: string;
    type: "File" | "Directory";
    compressedSize: number;
    uncompressedSize: number;
    flags: number;
    compressionMethod: number;
    crc32: number;
    diskNumber: number;
    offsetToLocalFileHeader: number;
    versionsNeededToExtract: number;
    stream(password?: string): import("stream").Readable;
    buffer(password?: string): Promise<Buffer>;
  }
  export interface CentralDirectory { files: Entry[]; }
  export namespace Open { function buffer(input: Buffer): Promise<CentralDirectory>; }
}
