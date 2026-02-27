/// <reference types="vite/client" />

// Vite ?url import suffix support
declare module '*.mjs?url' {
  const src: string;
  export default src;
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const url: string;
  export default url;
}
