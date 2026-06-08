/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
// Explicitly require the CJS build so Metro never resolves to the ESM build,
// which crashes at runtime due to a tslib CJS/ESM interop issue.
const _lib = require('pdf-lib/cjs/index.js');

export const PDFDocument: any = _lib.PDFDocument;
export const rgb: any = _lib.rgb;
export const StandardFonts: any = _lib.StandardFonts;
export const degrees: any = _lib.degrees;
