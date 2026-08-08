import { isMainThread, parentPort, Worker, workerData } from 'worker_threads';
import { TextDecoder } from 'util';
import { SaxesAttributeNS, SaxesParser, SaxesTagNS } from 'saxes';
import * as unzipper from 'unzipper';

export type MatrizOoxmlInspectionErrorCode =
  | 'INVALID_INPUT' | 'FILE_TOO_LARGE' | 'INSPECTION_TIMEOUT' | 'INVALID_ZIP'
  | 'TOO_MANY_ENTRIES' | 'ENCRYPTED_ENTRY' | 'UNSAFE_PATH' | 'DUPLICATE_ENTRY'
  | 'INVALID_ENTRY_SIZE' | 'ENTRY_TOO_LARGE' | 'ARCHIVE_TOO_LARGE'
  | 'COMPRESSION_RATIO_EXCEEDED' | 'FORBIDDEN_ENTRY' | 'REQUIRED_ENTRY_MISSING'
  | 'INVALID_CONTENT_TYPES' | 'INVALID_RELATIONSHIP' | 'EXTERNAL_RELATIONSHIP'
  | 'INVALID_WORKBOOK' | 'INVALID_SHEETS' | 'INDEPENDENT_MERGED_CELL_CONTENT';

export class MatrizOoxmlInspectionError extends Error {
  constructor(public readonly code: MatrizOoxmlInspectionErrorCode, message: string) {
    super(message);
    this.name = 'MatrizOoxmlInspectionError';
  }
}

export type MatrizOoxmlInspectionResult = {
  compressedBytes: number;
  uncompressedBytes: number;
  entryCount: number;
  sheetNames: ['PERFIL TRANSACCIONAL', 'GRADO DE RIESGO DE CLIENTE'];
};

type ZipEntry = unzipper.Entry;
type EntryMap = Map<string, ZipEntry>;
type Relationship = { id: string; type: string; target: string; resolved: string };
type XmlNode = { local: string; uri: string; attributes: SaxesAttributeNS[]; children: XmlNode[] };
type WorkerRequest = { mode: 'matriz-ooxml-inspection'; input: Uint8Array };
type WorkerReply = { ok: true; result: MatrizOoxmlInspectionResult } | { ok: false; code: MatrizOoxmlInspectionErrorCode };
type PhysicalEntry = {
  path: string; name: Buffer; versionNeeded: number; flags: number; method: number; crc32: number;
  compressedSize: number; uncompressedSize: number; localOffset: number; dataOffset: number;
  compressedEnd: number; physicalEnd: number;
};
type ZipGeometry = { entries: PhysicalEntry[]; centralOffset: number; centralSize: number };

const MIB = 1024 * 1024;
const MAX_COMPRESSED_BYTES = 5 * MIB;
const MAX_ENTRY_COUNT = 256;
const MAX_UNCOMPRESSED_BYTES = 25 * MIB;
const MAX_ENTRY_BYTES = 10 * MIB;
const MAX_XML_BYTES = MIB;
const MAX_SHEET_XML_BYTES = 10 * MIB;
const MAX_COMPRESSION_RATIO = 20;
const INSPECTION_TIMEOUT_MS = 5_000;
const OPC_REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CONTENT_TYPES_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const SPREADSHEET_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const OFFICE_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const MC_NS = 'http://schemas.openxmlformats.org/markup-compatibility/2006';
const REVISION_NAMESPACES = new Set(['http://schemas.microsoft.com/office/spreadsheetml/2014/revision',
  'http://schemas.microsoft.com/office/spreadsheetml/2016/revision']);
const SHEET_NAMES = ['PERFIL TRANSACCIONAL', 'GRADO DE RIESGO DE CLIENTE'] as const;
const CONTRACTUAL_MERGE_SECONDARIES: Record<typeof SHEET_NAMES[number], ReadonlySet<string>> = {
  'PERFIL TRANSACCIONAL': new Set(['B1', 'C1', 'D1', 'E1', 'B2', 'C2', 'D2', 'E2', 'G3']),
  'GRADO DE RIESGO DE CLIENTE': new Set([
    'B1', 'C1', 'D1', 'E1', 'B2', 'C2', 'D2', 'E2', 'H3',
    'F5', 'F6', 'F9', 'F10', 'F13', 'F14', 'F17', 'F18',
  ]),
};
const REQUIRED_ENTRIES = ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
  'xl/_rels/workbook.xml.rels', 'xl/styles.xml'] as const;
const EXACT_ALLOWED_ENTRIES = new Set<string>([...REQUIRED_ENTRIES, 'xl/sharedStrings.xml',
  'xl/calcChain.xml', 'docProps/core.xml', 'docProps/app.xml']);
const ALLOWED_DIRECTORY_ENTRIES = new Set<string>(['_rels/', 'xl/', 'xl/_rels/',
  'xl/worksheets/', 'xl/theme/', 'docProps/']);
const STRUCTURAL_XML = new Set<string>(['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
  'xl/_rels/workbook.xml.rels']);
const ZIP_FLAGS_ALLOWED = (1 << 1) | (1 << 2) | (1 << 3) | (1 << 11);

const CT = {
  workbook: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
  worksheet: 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml',
  styles: 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml',
  sharedStrings: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml',
  theme: 'application/vnd.openxmlformats-officedocument.theme+xml',
  calcChain: 'application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml',
  printerSettings: 'application/vnd.openxmlformats-officedocument.spreadsheetml.printerSettings',
  relationships: 'application/vnd.openxmlformats-package.relationships+xml',
  core: 'application/vnd.openxmlformats-package.core-properties+xml',
  app: 'application/vnd.openxmlformats-officedocument.extended-properties+xml',
  xml: 'application/xml',
} as const;
const RT = {
  officeDocument: `${OFFICE_REL_NS}/officeDocument`, core: `${OPC_REL_NS}/metadata/core-properties`,
  app: `${OFFICE_REL_NS}/extended-properties`, worksheet: `${OFFICE_REL_NS}/worksheet`,
  styles: `${OFFICE_REL_NS}/styles`, sharedStrings: `${OFFICE_REL_NS}/sharedStrings`,
  theme: `${OFFICE_REL_NS}/theme`, calcChain: `${OFFICE_REL_NS}/calcChain`,
  printerSettings: `${OFFICE_REL_NS}/printerSettings`,
} as const;

if (!isMainThread) {
  runWorker(workerData).catch(() => postWorkerError('INVALID_ZIP'));
}

async function runWorker(data: unknown): Promise<void> {
  if (!isWorkerRequest(data)) return postWorkerError('INVALID_INPUT');
  try {
    const result = await inspectInWorker(Buffer.from(data.input));
    parentPort?.postMessage({ ok: true, result } satisfies WorkerReply);
  } catch (error: unknown) {
    postWorkerError(error instanceof MatrizOoxmlInspectionError ? error.code : 'INVALID_ZIP');
  }
}

function postWorkerError(code: MatrizOoxmlInspectionErrorCode): void {
  parentPort?.postMessage({ ok: false, code } satisfies WorkerReply);
}

function isWorkerRequest(value: unknown): value is WorkerRequest {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return item.mode === 'matriz-ooxml-inspection' && item.input instanceof Uint8Array;
}

export function inspectMatrizXlsxOoxml(input: Buffer): Promise<MatrizOoxmlInspectionResult> {
  const startedAt = Date.now();
  if (!Buffer.isBuffer(input) || input.length === 0) return Promise.reject(err('INVALID_INPUT'));
  if (input.length > MAX_COMPRESSED_BYTES) return Promise.reject(err('FILE_TOO_LARGE'));
  const safeCopy = Uint8Array.from(input);
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: { mode: 'matriz-ooxml-inspection', input: safeCopy } satisfies WorkerRequest });
    let settled = false; let receivedReply = false; let exitWatch: NodeJS.Timeout | undefined;
    const cleanup = (): void => {
      clearTimeout(timer); if (exitWatch !== undefined) clearTimeout(exitWatch);
      worker.off('message', onMessage); worker.off('error', onError); worker.off('exit', onExit);
    };
    const finish = (error?: MatrizOoxmlInspectionError, result?: MatrizOoxmlInspectionResult): void => {
      if (settled) return;
      settled = true;
      if (error !== undefined) reject(error); else if (result !== undefined) resolve(result); else reject(err('INVALID_ZIP'));
    };
    const watchNaturalExit = (): void => {
      exitWatch = setTimeout(() => { void worker.terminate(); }, 100);
    };
    const onMessage = (message: unknown): void => {
      if (receivedReply) return;
      if (!isWorkerReply(message)) { finish(err('INVALID_ZIP')); cleanup(); void worker.terminate(); return; }
      receivedReply = true; clearTimeout(timer);
      worker.off('message', onMessage); worker.off('error', onError);
      if (message.ok) finish(undefined, message.result); else finish(err(message.code));
      watchNaturalExit();
    };
    const onError = (): void => { finish(err('INVALID_ZIP')); };
    const onExit = (code: number): void => {
      if (exitWatch !== undefined) clearTimeout(exitWatch);
      cleanup();
      if (!receivedReply || code !== 0) finish(err('INVALID_ZIP'));
    };
    const timer = setTimeout(() => {
      if (settled) return;
      finish(err('INSPECTION_TIMEOUT'));
      cleanup();
      void worker.terminate();
    }, Math.max(0, INSPECTION_TIMEOUT_MS - (Date.now() - startedAt)));
    worker.on('message', onMessage); worker.on('error', onError); worker.on('exit', onExit);
  });
}

function isWorkerReply(value: unknown): value is WorkerReply {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  if (item.ok === false) return isErrorCode(item.code);
  if (item.ok !== true || typeof item.result !== 'object' || item.result === null) return false;
  const result = item.result as Record<string, unknown>;
  return isSafeSize(result.compressedBytes) && isSafeSize(result.uncompressedBytes)
    && isSafeSize(result.entryCount) && Array.isArray(result.sheetNames)
    && result.sheetNames[0] === SHEET_NAMES[0] && result.sheetNames[1] === SHEET_NAMES[1];
}

const ERROR_CODES = new Set<MatrizOoxmlInspectionErrorCode>(['INVALID_INPUT', 'FILE_TOO_LARGE',
  'INSPECTION_TIMEOUT', 'INVALID_ZIP', 'TOO_MANY_ENTRIES', 'ENCRYPTED_ENTRY', 'UNSAFE_PATH',
  'DUPLICATE_ENTRY', 'INVALID_ENTRY_SIZE', 'ENTRY_TOO_LARGE', 'ARCHIVE_TOO_LARGE',
  'COMPRESSION_RATIO_EXCEEDED', 'FORBIDDEN_ENTRY', 'REQUIRED_ENTRY_MISSING',
  'INVALID_CONTENT_TYPES', 'INVALID_RELATIONSHIP', 'EXTERNAL_RELATIONSHIP',
  'INVALID_WORKBOOK', 'INVALID_SHEETS', 'INDEPENDENT_MERGED_CELL_CONTENT']);
function isErrorCode(value: unknown): value is MatrizOoxmlInspectionErrorCode {
  return typeof value === 'string' && ERROR_CODES.has(value as MatrizOoxmlInspectionErrorCode);
}

async function inspectInWorker(input: Buffer): Promise<MatrizOoxmlInspectionResult> {
  if (input.length === 0) throw err('INVALID_INPUT');
  if (input.length > MAX_COMPRESSED_BYTES) throw err('FILE_TOO_LARGE');
  const geometry = validateZipGeometry(input);
  let directory: unzipper.CentralDirectory;
  try { directory = await unzipper.Open.buffer(input); } catch { throw err('INVALID_ZIP'); }
  const entries = directory.files;
  if (entries.length !== geometry.entries.length) throw err('INVALID_ZIP');
  const entryMap: EntryMap = new Map();
  const folded = new Set<string>();
  let declaredTotal = 0; let declaredCompressedTotal = 0;
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]; const physical = geometry.entries[index];
    const { path, directory: isDirectory } = validateEntry(entry, physical);
    const key = path.toLowerCase();
    if (folded.has(key)) throw err('DUPLICATE_ENTRY');
    folded.add(key);
    declaredTotal = safeSum(declaredTotal, entry.uncompressedSize);
    declaredCompressedTotal = safeSum(declaredCompressedTotal, physical.compressedSize);
    if (entry.uncompressedSize > MAX_ENTRY_BYTES) throw err('ENTRY_TOO_LARGE');
    if (declaredTotal > MAX_UNCOMPRESSED_BYTES) throw err('ARCHIVE_TOO_LARGE');
    validateActualRatio(entry.uncompressedSize, physical.compressedSize);
    validateActualRatio(declaredTotal, declaredCompressedTotal);
    if (!isDirectory) entryMap.set(path, entry);
  }
  for (const required of REQUIRED_ENTRIES) if (!entryMap.has(required)) throw err('REQUIRED_ENTRY_MISSING');
  const xml = new Map<string, string>();
  const worksheetOwnContent = new Map<string, Set<string>>();
  let total = 0; let compressedTotal = 0;
  const physicalByPath = new Map(geometry.entries.map((item) => [item.path, item]));
  for (const [path, entry] of entryMap) {
    const physical = physicalByPath.get(path); if (physical === undefined) throw err('INVALID_ZIP');
    const capture = STRUCTURAL_XML.has(path) || isSheetRelationship(path);
    const drained = await drainEntry(entry, physical, total, compressedTotal, capture, isWorksheet(path));
    total += drained.bytes; compressedTotal += physical.compressedSize;
    if (drained.xml !== undefined) xml.set(path, drained.xml);
    if (drained.worksheetOwnContent !== undefined) worksheetOwnContent.set(path, drained.worksheetOwnContent);
  }
  validateContentTypes(requireXml(xml, '[Content_Types].xml'), entryMap);
  const rootRefs = validateRootRelationships(requireXml(xml, '_rels/.rels'), entryMap);
  const workbookRefs = validateWorkbookRelationships(requireXml(xml, 'xl/_rels/workbook.xml.rels'), entryMap);
  validateSheetRelationships(xml, entryMap);
  const worksheetParts = validateWorkbook(requireXml(xml, 'xl/workbook.xml'), workbookRefs);
  validateContractualMergeSecondaries(worksheetParts, worksheetOwnContent);
  validateNoOrphans(entryMap, rootRefs, workbookRefs, xml);
  return { compressedBytes: input.length, uncompressedBytes: total, entryCount: entries.length, sheetNames: [...SHEET_NAMES] };
}

function validateEntry(entry: ZipEntry, physical: PhysicalEntry): { path: string; directory: boolean } {
  const directory = entry.path.endsWith('/');
  const path = directory ? validateDirectoryPath(entry.path) : validatePath(entry.path, 'UNSAFE_PATH');
  if (directory ? entry.type !== 'Directory' : entry.type !== 'File') throw err('FORBIDDEN_ENTRY');
  if (!directory && !isAllowedEntry(path)) throw err('FORBIDDEN_ENTRY');
  if (path !== physical.path) throw err('INVALID_ZIP');
  for (const size of [entry.compressedSize, entry.uncompressedSize, entry.offsetToLocalFileHeader,
    entry.versionsNeededToExtract, entry.flags, entry.compressionMethod, entry.diskNumber, entry.crc32])
    if (!isSafeSize(size)) throw err('INVALID_ENTRY_SIZE');
  if (entry.diskNumber !== 0 || entry.crc32 > 0xffffffff
    || entry.compressedSize !== physical.compressedSize || entry.uncompressedSize !== physical.uncompressedSize
    || entry.offsetToLocalFileHeader !== physical.localOffset || entry.versionsNeededToExtract !== physical.versionNeeded
    || entry.flags !== physical.flags || entry.compressionMethod !== physical.method
    || (entry.crc32 >>> 0) !== physical.crc32) throw err('INVALID_ZIP');
  if (directory && (entry.compressedSize !== 0 || entry.uncompressedSize !== 0 || entry.crc32 !== 0
    || physical.compressedSize !== 0 || physical.uncompressedSize !== 0 || physical.crc32 !== 0
    || entry.flags !== 0 || entry.compressionMethod !== 0)) throw err('FORBIDDEN_ENTRY');
  return { path, directory };
}

function validateZipGeometry(input: Buffer): ZipGeometry {
  const minimum = 22; if (input.length < minimum) throw err('INVALID_ZIP');
  const candidates: number[] = []; const start = Math.max(0, input.length - minimum - 0xffff);
  for (let offset = start; offset <= input.length - minimum; offset += 1) {
    if (input.readUInt32LE(offset) === 0x06054b50
      && offset + minimum + input.readUInt16LE(offset + 20) === input.length) candidates.push(offset);
  }
  if (candidates.length !== 1) throw err('INVALID_ZIP');
  const eocd = candidates[0];
  if ((eocd >= 20 && input.readUInt32LE(eocd - 20) === 0x07064b50)
    || (eocd >= 56 && input.readUInt32LE(eocd - 56) === 0x06064b50)) throw err('INVALID_ZIP');
  const disk = input.readUInt16LE(eocd + 4); const centralDisk = input.readUInt16LE(eocd + 6);
  const diskEntries = input.readUInt16LE(eocd + 8); const totalEntries = input.readUInt16LE(eocd + 10);
  const centralSize = input.readUInt32LE(eocd + 12); const centralOffset = input.readUInt32LE(eocd + 16);
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries
    || totalEntries === 0 || totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) throw err('INVALID_ZIP');
  if (totalEntries > MAX_ENTRY_COUNT) throw err('TOO_MANY_ENTRIES');
  const centralEnd = checkedAdd(centralOffset, centralSize);
  if (centralEnd !== eocd || centralEnd > input.length) throw err('INVALID_ZIP');
  const entries: PhysicalEntry[] = []; let cursor = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    requireRegion(input, cursor, 46);
    if (input.readUInt32LE(cursor) !== 0x02014b50) throw err('INVALID_ZIP');
    const versionNeeded = input.readUInt16LE(cursor + 6); const flags = input.readUInt16LE(cursor + 8);
    const method = input.readUInt16LE(cursor + 10); const crc32 = input.readUInt32LE(cursor + 16);
    const compressedSize = input.readUInt32LE(cursor + 20); const uncompressedSize = input.readUInt32LE(cursor + 24);
    const nameLength = input.readUInt16LE(cursor + 28); const extraLength = input.readUInt16LE(cursor + 30);
    const commentLength = input.readUInt16LE(cursor + 32); const diskStart = input.readUInt16LE(cursor + 34);
    const localOffset = input.readUInt32LE(cursor + 42);
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff || diskStart === 0xffff) throw err('INVALID_ZIP');
    const recordEnd = checkedAdd(cursor, 46, nameLength, extraLength, commentLength);
    if (recordEnd > centralEnd) throw err('INVALID_ZIP');
    const name = input.subarray(cursor + 46, cursor + 46 + nameLength);
    validateZipFlags(flags, method); validateZipExtra(input.subarray(cursor + 46 + nameLength, cursor + 46 + nameLength + extraLength));
    if (diskStart !== 0) throw err('INVALID_ZIP');
    const path = decodeCanonicalZipName(name);
    entries.push(validateLocalRecord(input, centralOffset, { path, name: Buffer.from(name), versionNeeded, flags, method,
      crc32, compressedSize, uncompressedSize, localOffset, dataOffset: 0, compressedEnd: 0, physicalEnd: 0 }));
    cursor = recordEnd;
  }
  if (cursor !== centralEnd || entries.length !== totalEntries) throw err('INVALID_ZIP');
  const offsets = new Set<number>();
  for (const entry of entries) { if (offsets.has(entry.localOffset)) throw err('INVALID_ZIP'); offsets.add(entry.localOffset); }
  const ordered = [...entries].sort((left, right) => left.localOffset - right.localOffset);
  if (ordered.length === 0 || ordered[0].localOffset !== 0) throw err('INVALID_ZIP');
  for (let index = 0; index < ordered.length; index += 1) {
    const item = ordered[index];
    if (item.localOffset >= centralOffset || item.physicalEnd > centralOffset
      || (index > 0 && ordered[index - 1].physicalEnd > item.localOffset)) throw err('INVALID_ZIP');
    if (index > 0 && ordered[index - 1].physicalEnd !== item.localOffset) throw err('INVALID_ZIP');
  }
  if (ordered[ordered.length - 1].physicalEnd !== centralOffset) throw err('INVALID_ZIP');
  return { entries, centralOffset, centralSize };
}

function validateLocalRecord(input: Buffer, centralOffset: number, central: PhysicalEntry): PhysicalEntry {
  requireRegion(input, central.localOffset, 30);
  if (input.readUInt32LE(central.localOffset) !== 0x04034b50) throw err('INVALID_ZIP');
  const versionNeeded = input.readUInt16LE(central.localOffset + 4); const flags = input.readUInt16LE(central.localOffset + 6);
  const method = input.readUInt16LE(central.localOffset + 8); const crc32 = input.readUInt32LE(central.localOffset + 14);
  const compressedSize = input.readUInt32LE(central.localOffset + 18); const uncompressedSize = input.readUInt32LE(central.localOffset + 22);
  const nameLength = input.readUInt16LE(central.localOffset + 26); const extraLength = input.readUInt16LE(central.localOffset + 28);
  const dataOffset = checkedAdd(central.localOffset, 30, nameLength, extraLength);
  requireRegion(input, central.localOffset, 30 + nameLength + extraLength);
  const localName = input.subarray(central.localOffset + 30, central.localOffset + 30 + nameLength);
  const localExtra = input.subarray(central.localOffset + 30 + nameLength, dataOffset);
  validateZipExtra(localExtra); validateZipFlags(flags, method);
  if (versionNeeded !== central.versionNeeded || flags !== central.flags || method !== central.method
    || !localName.equals(central.name)) throw err('INVALID_ZIP');
  const compressedEnd = checkedAdd(dataOffset, central.compressedSize);
  if (compressedEnd > centralOffset || compressedEnd > input.length) throw err('INVALID_ZIP');
  let physicalEnd = compressedEnd;
  if ((flags & (1 << 3)) === 0) {
    if (crc32 !== central.crc32 || compressedSize !== central.compressedSize || uncompressedSize !== central.uncompressedSize) throw err('INVALID_ZIP');
  } else {
    if ((crc32 !== 0 && crc32 !== central.crc32)
      || (compressedSize !== 0 && compressedSize !== central.compressedSize)
      || (uncompressedSize !== 0 && uncompressedSize !== central.uncompressedSize)) throw err('INVALID_ZIP');
    const signed = compressedEnd + 16 <= centralOffset && input.readUInt32LE(compressedEnd) === 0x08074b50
      && input.readUInt32LE(compressedEnd + 4) === central.crc32
      && input.readUInt32LE(compressedEnd + 8) === central.compressedSize
      && input.readUInt32LE(compressedEnd + 12) === central.uncompressedSize;
    const unsigned = compressedEnd + 12 <= centralOffset
      && input.readUInt32LE(compressedEnd) === central.crc32
      && input.readUInt32LE(compressedEnd + 4) === central.compressedSize
      && input.readUInt32LE(compressedEnd + 8) === central.uncompressedSize;
    if (!signed && !unsigned) throw err('INVALID_ZIP');
    physicalEnd = compressedEnd + (signed ? 16 : 12);
  }
  return { ...central, dataOffset, compressedEnd, physicalEnd };
}

function validateZipFlags(flags: number, method: number): void {
  if ((flags & 1) !== 0) throw err('ENCRYPTED_ENTRY');
  if ((flags & ~ZIP_FLAGS_ALLOWED) !== 0 || (method !== 0 && method !== 8)) throw err('INVALID_ZIP');
  if (method !== 8 && (flags & ((1 << 1) | (1 << 2))) !== 0) throw err('INVALID_ZIP');
}
function validateZipExtra(extra: Buffer): void {
  let offset = 0;
  while (offset < extra.length) {
    if (offset + 4 > extra.length) throw err('INVALID_ZIP');
    const id = extra.readUInt16LE(offset); const size = extra.readUInt16LE(offset + 2); offset = checkedAdd(offset, 4);
    if (offset + size > extra.length || id === 0x0001) throw err('INVALID_ZIP'); offset += size;
  }
}
function decodeCanonicalZipName(name: Buffer): string {
  if (name.length === 0 || Array.from(name).some((byte) => byte === 0 || byte > 0x7f)) throw err('INVALID_ZIP');
  const path = name.toString('ascii');
  if (!Buffer.from(path, 'utf8').equals(name)) throw err('INVALID_ZIP');
  return path.endsWith('/') ? validateDirectoryPath(path) : validatePath(path, 'UNSAFE_PATH');
}
function requireRegion(input: Buffer, offset: number, length: number): void {
  if (!isSafeSize(offset) || !isSafeSize(length) || checkedAdd(offset, length) > input.length) throw err('INVALID_ZIP');
}
function checkedAdd(...values: number[]): number {
  let total = 0; for (const value of values) { if (!isSafeSize(value)) throw err('INVALID_ENTRY_SIZE'); total += value; if (!Number.isSafeInteger(total)) throw err('INVALID_ENTRY_SIZE'); }
  return total;
}

async function drainEntry(entry: ZipEntry, physical: PhysicalEntry, priorTotal: number, priorCompressed: number,
  captureXml: boolean, validateSheet: boolean): Promise<{ bytes: number; xml?: string; worksheetOwnContent?: Set<string> }> {
  let stream: import('stream').Readable;
  try { stream = entry.stream(); } catch { throw err('INVALID_ZIP'); }
  let bytes = 0; let crc = 0xffffffff; const chunks: Buffer[] = [];
  const sheetValidator = validateSheet ? createWorksheetValidator() : undefined;
  try {
    for await (const raw of stream) {
      const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as Uint8Array);
      bytes += chunk.length; crc = updateCrc32(crc, chunk);
      if (bytes > MAX_ENTRY_BYTES) throw err('ENTRY_TOO_LARGE');
      if (priorTotal + bytes > MAX_UNCOMPRESSED_BYTES) throw err('ARCHIVE_TOO_LARGE');
      validateActualRatio(bytes, physical.compressedSize);
      validateActualRatio(priorTotal + bytes, priorCompressed + physical.compressedSize);
      if (sheetValidator !== undefined) sheetValidator.write(chunk, bytes);
      if (captureXml) {
        if (bytes > MAX_XML_BYTES) throw err('INVALID_ENTRY_SIZE');
        chunks.push(chunk);
      }
    }
  } catch (error: unknown) {
    stream.destroy();
    if (error instanceof MatrizOoxmlInspectionError) throw error;
    throw err('INVALID_ZIP');
  }
  if (sheetValidator !== undefined) sheetValidator.close();
  if (bytes !== entry.uncompressedSize) throw err('INVALID_ENTRY_SIZE');
  if ((crc ^ 0xffffffff) >>> 0 !== entry.crc32 >>> 0) throw err('INVALID_ENTRY_SIZE');
  if (!captureXml) return { bytes, worksheetOwnContent: sheetValidator?.ownContent };
  const content = Buffer.concat(chunks);
  if (content.includes(0)) throw err('INVALID_ZIP');
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(content); } catch { throw err('INVALID_ZIP'); }
  return { bytes, xml: text, worksheetOwnContent: sheetValidator?.ownContent };
}

function createWorksheetValidator(): { write: (chunk: Buffer, bytes: number) => void; close: () => void; ownContent: Set<string> } {
  const parser = new SaxesParser({ xmlns: true }); const decoder = new TextDecoder('utf-8', { fatal: true });
  let depth = 0; let nodes = 0; let roots = 0; let rootOpen = false;
  let cellDepth = 0; let cellReference: string | undefined; const ownContent = new Set<string>();
  const fail = (): never => { throw err('INVALID_SHEETS'); };
  parser.on('doctype', fail); parser.on('processinginstruction', fail); parser.on('cdata', fail); parser.on('error', fail);
  parser.on('text', (value: string) => { if (!rootOpen && value.trim().length !== 0) fail(); });
  parser.on('opentag', (tag: SaxesTagNS) => {
    if (depth === 0) { roots += 1; if (roots !== 1 || tag.local !== 'worksheet' || tag.uri !== SPREADSHEET_NS) fail(); rootOpen = true; }
    depth += 1; nodes += 1; if (depth > 64 || nodes > 10000) fail();
    if (tag.local === 'c' && tag.uri === SPREADSHEET_NS) {
      const references = Object.values(tag.attributes).filter((item) => item.local === 'r' && item.uri === '');
      const allReferences = Object.values(tag.attributes).filter((item) => item.local === 'r');
      if (allReferences.length !== 1 || references.length !== 1 || !isCanonicalCellReference(references[0].value)) fail();
      if (cellDepth === 0) { cellDepth = depth; cellReference = references[0].value; }
    } else if (cellDepth !== 0 && tag.uri === SPREADSHEET_NS
      && (tag.local === 'f' || tag.local === 'v' || tag.local === 'is')
      && cellReference !== undefined) ownContent.add(cellReference);
  });
  parser.on('closetag', () => {
    if (depth === cellDepth) { cellDepth = 0; cellReference = undefined; }
    depth -= 1; if (depth === 0) rootOpen = false;
  });
  return {
    ownContent,
    write: (chunk: Buffer, bytes: number): void => {
      if (bytes > MAX_SHEET_XML_BYTES || chunk.includes(0)) fail();
      try { parser.write(decoder.decode(chunk, { stream: true })); } catch { fail(); }
    },
    close: (): void => {
      try { parser.write(decoder.decode()).close(); } catch { fail(); }
      if (roots !== 1 || depth !== 0) fail();
    },
  };
}

function isCanonicalCellReference(value: string): boolean {
  const match = /^([A-Z]{1,3})([1-9][0-9]{0,6})$/.exec(value);
  if (match === null) return false;
  let column = 0;
  for (const character of match[1]) column = column * 26 + character.charCodeAt(0) - 64;
  const row = Number(match[2]);
  return column <= 16384 && row <= 1048576;
}

function validateActualRatio(expanded: number, compressed: number): void {
  if (compressed === 0 ? expanded > 0 : expanded / compressed > MAX_COMPRESSION_RATIO) throw err('COMPRESSION_RATIO_EXCEEDED');
}

const CRC_TABLE = makeCrcTable();
function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  return table;
}
function updateCrc32(crc: number, chunk: Buffer): number {
  let value = crc; for (const byte of chunk) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8); return value >>> 0;
}

function parseXml(text: string, rootLocal: string, rootUri: string, code: MatrizOoxmlInspectionErrorCode): XmlNode {
  const parser = new SaxesParser({ xmlns: true }); const stack: XmlNode[] = []; let root: XmlNode | undefined; let failed = false; let nodeCount = 0;
  const fail = (): never => { failed = true; throw err(code); };
  // DTDs and entity declarations are rejected with DOCTYPE. Saxes may still resolve the
  // five predefined XML entities and ordinary numeric character references.
  parser.on('doctype', fail); parser.on('processinginstruction', fail); parser.on('cdata', fail);
  parser.on('error', fail);
  parser.on('text', (value: string) => {
    if (value.trim().length === 0) return;
    const container = stack[stack.length - 1];
    if (rootUri !== SPREADSHEET_NS || container === undefined
      || container.local !== 'definedName' || container.uri !== SPREADSHEET_NS) fail();
  });
  parser.on('opentag', (tag: SaxesTagNS) => {
    nodeCount += 1; if (nodeCount > 4096 || stack.length >= 64) fail();
    const node: XmlNode = { local: tag.local, uri: tag.uri, attributes: Object.values(tag.attributes), children: [] };
    if (stack.length === 0) { if (root !== undefined) fail(); root = node; } else stack[stack.length - 1].children.push(node);
    stack.push(node);
  });
  parser.on('closetag', () => { stack.pop(); });
  try { parser.write(text).close(); } catch { throw err(code); }
  if (failed || root === undefined || root.local !== rootLocal || root.uri !== rootUri) throw err(code);
  return root;
}

function attr(node: XmlNode, local: string, uri: string, code: MatrizOoxmlInspectionErrorCode, optional = false): string | undefined {
  const found = node.attributes.filter((item) => item.local === local && item.uri === uri);
  if (found.length !== 1 || (!optional && found[0].value.length === 0)) { if (optional && found.length === 0) return undefined; throw err(code); }
  return found[0].value;
}
function exactAttributes(node: XmlNode, allowed: ReadonlyArray<readonly [string, string]>, code: MatrizOoxmlInspectionErrorCode): void {
  for (const item of node.attributes) {
    if (item.prefix === 'xmlns' || item.name === 'xmlns') continue;
    if (!allowed.some(([local, uri]) => item.local === local && item.uri === uri)) throw err(code);
  }
}

function validateContentTypes(text: string, entries: EntryMap): void {
  const root = parseXml(text, 'Types', CONTENT_TYPES_NS, 'INVALID_CONTENT_TYPES');
  exactAttributes(root, [], 'INVALID_CONTENT_TYPES'); const byPart = new Map<string, string>(); const defaults = new Map<string, string>();
  for (const node of root.children) {
    if (node.uri !== CONTENT_TYPES_NS || (node.local !== 'Default' && node.local !== 'Override') || node.children.length !== 0) throw err('INVALID_CONTENT_TYPES');
    if (node.local === 'Override') {
      exactAttributes(node, [['PartName', ''], ['ContentType', '']], 'INVALID_CONTENT_TYPES');
      const part = attr(node, 'PartName', '', 'INVALID_CONTENT_TYPES') as string; const type = attr(node, 'ContentType', '', 'INVALID_CONTENT_TYPES') as string;
      if (!part.startsWith('/') || part.length === 1) throw err('INVALID_CONTENT_TYPES');
      const path = validatePath(part.slice(1), 'INVALID_CONTENT_TYPES');
      if (!entries.has(path) || byPart.has(path) || type !== expectedContentType(path)) throw err('INVALID_CONTENT_TYPES'); byPart.set(path, type);
    } else {
      exactAttributes(node, [['Extension', ''], ['ContentType', '']], 'INVALID_CONTENT_TYPES');
      const extension = (attr(node, 'Extension', '', 'INVALID_CONTENT_TYPES') as string).toLowerCase(); const type = attr(node, 'ContentType', '', 'INVALID_CONTENT_TYPES') as string;
      if (!['rels', 'xml', 'bin', 'vml'].includes(extension) || defaults.has(extension)) throw err('INVALID_CONTENT_TYPES');
      if ((extension === 'rels' && type !== CT.relationships) || (extension === 'xml' && type !== CT.xml) || (extension === 'bin' && type !== CT.printerSettings) || (extension === 'vml' && type !== 'application/vnd.openxmlformats-officedocument.vmlDrawing')) throw err('INVALID_CONTENT_TYPES'); defaults.set(extension, type);
    }
  }
  for (const path of entries.keys()) if (path !== '[Content_Types].xml') {
    const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
    if ((byPart.get(path) ?? defaults.get(extension)) !== expectedContentType(path)) throw err('INVALID_CONTENT_TYPES');
  }
  for (const path of byPart.keys()) if (!entries.has(path)) throw err('INVALID_CONTENT_TYPES');
  for (const extension of defaults.keys()) {
    if (extension === 'rels' || extension === 'xml' || extension === 'vml') continue;
    if (extension === 'bin') {
      if (!Array.from(entries.keys()).some(isPrinterSettings)) throw err('INVALID_CONTENT_TYPES');
      continue;
    }
    const used = Array.from(entries.keys()).some((path) => path !== '[Content_Types].xml'
      && path.slice(path.lastIndexOf('.') + 1).toLowerCase() === extension && !byPart.has(path));
    if (!used) throw err('INVALID_CONTENT_TYPES');
  }
}

function parseRelationships(text: string, base: string, entries: EntryMap): Relationship[] {
  const root = parseXml(text, 'Relationships', OPC_REL_NS, 'INVALID_RELATIONSHIP'); exactAttributes(root, [], 'INVALID_RELATIONSHIP');
  const ids = new Set<string>(); const semantic = new Set<string>();
  return root.children.map((node) => {
    if (node.local !== 'Relationship' || node.uri !== OPC_REL_NS || node.children.length !== 0) throw err('INVALID_RELATIONSHIP');
    exactAttributes(node, [['Id', ''], ['Type', ''], ['Target', ''], ['TargetMode', '']], 'INVALID_RELATIONSHIP');
    const id = attr(node, 'Id', '', 'INVALID_RELATIONSHIP') as string; const type = attr(node, 'Type', '', 'INVALID_RELATIONSHIP') as string; const target = attr(node, 'Target', '', 'INVALID_RELATIONSHIP') as string;
    if (attr(node, 'TargetMode', '', 'INVALID_RELATIONSHIP', true) !== undefined) throw err('EXTERNAL_RELATIONSHIP');
    const resolved = resolveTarget(base, target); const key = `${type}\0${resolved}`;
    if (ids.has(id) || semantic.has(key) || !entries.has(resolved)) throw err('INVALID_RELATIONSHIP'); ids.add(id); semantic.add(key);
    return { id, type, target, resolved };
  });
}

function validateRootRelationships(text: string, entries: EntryMap): Set<string> {
  const rels = parseRelationships(text, '', entries); const refs = new Set<string>(); let office = 0;
  for (const rel of rels) {
    if (rel.type === RT.officeDocument && rel.resolved === 'xl/workbook.xml') office += 1;
    else if (!((rel.type === RT.core && rel.resolved === 'docProps/core.xml') || (rel.type === RT.app && rel.resolved === 'docProps/app.xml'))) throw err('INVALID_RELATIONSHIP');
    refs.add(rel.resolved);
  }
  if (office !== 1) throw err('INVALID_RELATIONSHIP'); return refs;
}

function validateWorkbookRelationships(text: string, entries: EntryMap): Relationship[] {
  const rels = parseRelationships(text, 'xl', entries); const counts = new Map<string, number>();
  for (const rel of rels) {
    const valid = (rel.type === RT.worksheet && isWorksheet(rel.resolved))
      || (rel.type === RT.styles && rel.resolved === 'xl/styles.xml')
      || (rel.type === RT.sharedStrings && rel.resolved === 'xl/sharedStrings.xml')
      || (rel.type === RT.calcChain && rel.resolved === 'xl/calcChain.xml')
      || (rel.type === RT.theme && isTheme(rel.resolved));
    if (!valid) throw err('INVALID_RELATIONSHIP'); counts.set(rel.type, (counts.get(rel.type) ?? 0) + 1);
  }
  if (counts.get(RT.worksheet) !== 2 || counts.get(RT.styles) !== 1) throw err('INVALID_RELATIONSHIP');
  for (const type of [RT.sharedStrings, RT.calcChain, RT.theme]) if ((counts.get(type) ?? 0) > 1) throw err('INVALID_RELATIONSHIP');
  return rels;
}

function validateSheetRelationships(xml: Map<string, string>, entries: EntryMap): void {
  const binRefs = new Map<string, number>();
  for (const [path, text] of xml) if (isSheetRelationship(path)) {
    const worksheetPath = worksheetForRelationship(path);
    const rels = parseRelationships(text, 'xl/worksheets', entries);
    if (rels.length === 0) throw err('INVALID_RELATIONSHIP');
    for (const rel of rels) {
      if (rel.type !== RT.printerSettings || !isPrinterSettings(rel.resolved)) throw err('INVALID_RELATIONSHIP');
      binRefs.set(rel.resolved, (binRefs.get(rel.resolved) ?? 0) + 1);
    }
    if (!entries.has(worksheetPath)) throw err('INVALID_RELATIONSHIP');
  }
  for (const path of entries.keys()) if (isPrinterSettings(path) && binRefs.get(path) !== 1) throw err('INVALID_RELATIONSHIP');
}

function validateWorkbook(text: string, rels: Relationship[]): Map<typeof SHEET_NAMES[number], string> {
  const root = parseXml(text, 'workbook', SPREADSHEET_NS, 'INVALID_WORKBOOK');
  exactAttributes(root, [['Ignorable', MC_NS]], 'INVALID_WORKBOOK');
  const knownSpreadsheet = new Set(['fileVersion', 'workbookPr', 'bookViews', 'sheets', 'definedNames', 'calcPr', 'extLst']);
  for (const child of root.children) {
    const validSpreadsheet = child.uri === SPREADSHEET_NS && knownSpreadsheet.has(child.local);
    const validAlternate = child.uri === MC_NS && child.local === 'AlternateContent';
    const validRevision = child.local === 'revisionPtr' && REVISION_NAMESPACES.has(child.uri);
    if (!validSpreadsheet && !validAlternate && !validRevision) throw err('INVALID_WORKBOOK');
  }
  const containers = root.children.filter((child) => child.local === 'sheets' && child.uri === SPREADSHEET_NS);
  if (containers.length !== 1) throw err('INVALID_SHEETS'); const sheets = containers[0].children;
  if (sheets.length !== 2) throw err('INVALID_SHEETS');
  const names = new Set<string>(); const ids = new Set<string>(); const relationshipIds = new Set<string>(); const worksheetParts = new Set<string>();
  const partsByName = new Map<typeof SHEET_NAMES[number], string>();
  for (const node of sheets) {
    if (node.local !== 'sheet' || node.uri !== SPREADSHEET_NS || node.children.length !== 0) throw err('INVALID_SHEETS');
    exactAttributes(node, [['name', ''], ['sheetId', ''], ['state', ''], ['id', OFFICE_REL_NS]], 'INVALID_SHEETS');
    const name = attr(node, 'name', '', 'INVALID_SHEETS') as string; const sheetId = attr(node, 'sheetId', '', 'INVALID_SHEETS') as string;
    const relationshipId = attr(node, 'id', OFFICE_REL_NS, 'INVALID_SHEETS') as string; const state = attr(node, 'state', '', 'INVALID_SHEETS', true);
    if (!SHEET_NAMES.includes(name as typeof SHEET_NAMES[number]) || !isValidSheetId(sheetId)
      || (state !== undefined && state !== 'visible')) throw err('INVALID_SHEETS');
    if (names.has(name) || ids.has(sheetId) || relationshipIds.has(relationshipId)) throw err('INVALID_SHEETS');
    names.add(name); ids.add(sheetId); relationshipIds.add(relationshipId);
    const matching = rels.filter((rel) => rel.id === relationshipId && rel.type === RT.worksheet);
    if (matching.length !== 1 || !isWorksheet(matching[0].resolved) || worksheetParts.has(matching[0].resolved)) throw err('INVALID_SHEETS');
    worksheetParts.add(matching[0].resolved);
    partsByName.set(name as typeof SHEET_NAMES[number], matching[0].resolved);
  }
  if (SHEET_NAMES.some((name) => !names.has(name))) throw err('INVALID_SHEETS');
  return partsByName;
}

function validateContractualMergeSecondaries(
  worksheetParts: Map<typeof SHEET_NAMES[number], string>,
  worksheetOwnContent: Map<string, Set<string>>,
): void {
  for (const sheetName of SHEET_NAMES) {
    const part = worksheetParts.get(sheetName); const ownContent = part === undefined ? undefined : worksheetOwnContent.get(part);
    if (ownContent === undefined) throw err('INVALID_SHEETS');
    for (const reference of CONTRACTUAL_MERGE_SECONDARIES[sheetName]) {
      if (ownContent.has(reference)) throw err('INDEPENDENT_MERGED_CELL_CONTENT');
    }
  }
}

function validateNoOrphans(entries: EntryMap, rootRefs: Set<string>, workbookRefs: Relationship[], xml: Map<string, string>): void {
  const workbookTargets = new Set(workbookRefs.map((rel) => rel.resolved));
  for (const path of entries.keys()) {
    if (REQUIRED_ENTRIES.includes(path as typeof REQUIRED_ENTRIES[number]) || path === '[Content_Types].xml' || path === '_rels/.rels') continue;
    if (path.startsWith('docProps/')) { if (!rootRefs.has(path)) throw err('INVALID_RELATIONSHIP'); continue; }
    if (isSheetRelationship(path)) {
      if (!workbookTargets.has(worksheetForRelationship(path))) throw err('INVALID_RELATIONSHIP');
      continue;
    }
    if (isPrinterSettings(path)) continue;
    if (!workbookTargets.has(path)) throw err('INVALID_RELATIONSHIP');
  }
  for (const path of entries.keys()) if (isSheetRelationship(path) && !xml.has(path)) throw err('INVALID_RELATIONSHIP');
}

function resolveTarget(base: string, target: string): string {
  if (target.length === 0 || target.includes('\\') || target.startsWith('/') || target.includes('?') || target.includes('#') || target.includes(':') || !isAscii(target)) throw err('INVALID_RELATIONSHIP');
  const output = base === '' ? [] : base.split('/');
  for (const segment of target.split('/')) { if (segment === '' || segment === '.') throw err('INVALID_RELATIONSHIP'); if (segment === '..') { if (output.length === 0) throw err('INVALID_RELATIONSHIP'); output.pop(); } else output.push(segment); }
  return validatePath(output.join('/'), 'INVALID_RELATIONSHIP');
}
function validatePath(path: string, code: MatrizOoxmlInspectionErrorCode): string {
  if (path.length === 0 || !isAscii(path) || path.includes('\\') || path.startsWith('/') || path.includes(':')) throw err(code);
  const parts = path.split('/'); if (parts.some((part) => part === '' || part === '.' || part === '..')) throw err(code); return path;
}
function validateDirectoryPath(path: string): string {
  if (!path.endsWith('/') || path.endsWith('//')) throw err('UNSAFE_PATH');
  validatePath(path.slice(0, -1), 'UNSAFE_PATH');
  if (!ALLOWED_DIRECTORY_ENTRIES.has(path)) throw err('FORBIDDEN_ENTRY');
  return path;
}
function isAscii(value: string): boolean { for (let i = 0; i < value.length; i += 1) if (value.charCodeAt(i) > 0x7f || value.charCodeAt(i) === 0) return false; return true; }
function isAllowedEntry(path: string): boolean { return EXACT_ALLOWED_ENTRIES.has(path) || isWorksheet(path) || isTheme(path) || isPrinterSettings(path) || isSheetRelationship(path); }
function isWorksheet(path: string): boolean { return numberedPath(path, 'xl/worksheets/sheet', '.xml'); }
function isTheme(path: string): boolean { return numberedPath(path, 'xl/theme/theme', '.xml'); }
function isPrinterSettings(path: string): boolean { return numberedPath(path, 'xl/printerSettings/printerSettings', '.bin'); }
function isSheetRelationship(path: string): boolean { return numberedPath(path, 'xl/worksheets/_rels/sheet', '.xml.rels'); }
function worksheetForRelationship(path: string): string {
  if (!isSheetRelationship(path)) throw err('INVALID_RELATIONSHIP');
  return `xl/worksheets/${path.slice('xl/worksheets/_rels/'.length, -'.rels'.length)}`;
}
function isValidSheetId(value: string): boolean {
  if (value.length === 0 || value[0] === '0' || !Array.from(value).every((ch) => ch >= '0' && ch <= '9')) return false;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric <= 0xffffffff;
}
function numberedPath(path: string, prefix: string, suffix: string): boolean { if (!path.startsWith(prefix) || !path.endsWith(suffix)) return false; const number = path.slice(prefix.length, -suffix.length); return number.length > 0 && number[0] !== '0' && Array.from(number).every((ch) => ch >= '0' && ch <= '9'); }
function expectedContentType(path: string): string {
  if (path.endsWith('.rels')) return CT.relationships; if (path === 'xl/workbook.xml') return CT.workbook;
  if (isWorksheet(path)) return CT.worksheet;
  if (path === 'xl/styles.xml') return CT.styles; if (path === 'xl/sharedStrings.xml') return CT.sharedStrings;
  if (path === 'xl/calcChain.xml') return CT.calcChain; if (isTheme(path)) return CT.theme; if (isPrinterSettings(path)) return CT.printerSettings;
  if (path === 'docProps/core.xml') return CT.core; if (path === 'docProps/app.xml') return CT.app; throw err('INVALID_CONTENT_TYPES');
}
function requireXml(xml: Map<string, string>, path: string): string { const value = xml.get(path); if (value === undefined) throw err('REQUIRED_ENTRY_MISSING'); return value; }
function isSafeSize(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && Number.isSafeInteger(value) && value >= 0; }
function safeSum(left: number, right: number): number { const value = left + right; if (!Number.isSafeInteger(value)) throw err('INVALID_ENTRY_SIZE'); return value; }
function err(code: MatrizOoxmlInspectionErrorCode): MatrizOoxmlInspectionError { return new MatrizOoxmlInspectionError(code, publicMessage(code)); }
function publicMessage(code: MatrizOoxmlInspectionErrorCode): string {
  const messages: Record<MatrizOoxmlInspectionErrorCode, string> = {
    INVALID_INPUT: 'Entrada no válida.', FILE_TOO_LARGE: 'Archivo demasiado grande.', INSPECTION_TIMEOUT: 'Inspección agotada.', INVALID_ZIP: 'ZIP no válido.', TOO_MANY_ENTRIES: 'Demasiadas entradas.', ENCRYPTED_ENTRY: 'Entrada cifrada.', UNSAFE_PATH: 'Ruta no segura.', DUPLICATE_ENTRY: 'Entrada duplicada.', INVALID_ENTRY_SIZE: 'Tamaño de entrada no válido.', ENTRY_TOO_LARGE: 'Entrada demasiado grande.', ARCHIVE_TOO_LARGE: 'Archivo expandido demasiado grande.', COMPRESSION_RATIO_EXCEEDED: 'Compresión no permitida.', FORBIDDEN_ENTRY: 'Entrada no permitida.', REQUIRED_ENTRY_MISSING: 'Falta una entrada requerida.', INVALID_CONTENT_TYPES: 'Tipos de contenido no válidos.', INVALID_RELATIONSHIP: 'Relaciones no válidas.', EXTERNAL_RELATIONSHIP: 'Relación externa no permitida.', INVALID_WORKBOOK: 'Libro no válido.', INVALID_SHEETS: 'Hojas no válidas.', INDEPENDENT_MERGED_CELL_CONTENT: 'Existe contenido independiente en una celda secundaria de una combinación contractual.',
  }; return messages[code];
}
