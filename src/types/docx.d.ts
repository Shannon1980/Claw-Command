declare module "docx" {
  export class Document {
    constructor(options?: Record<string, unknown>);
  }
  export class Packer {
    static toBlob(doc: Document): Promise<Blob>;
  }
  export class Paragraph {
    constructor(options?: Record<string, unknown>);
  }
  export class TextRun {
    constructor(options?: Record<string, unknown>);
  }
  export enum HeadingLevel {
    HEADING_1 = "HEADING_1",
    HEADING_2 = "HEADING_2",
    HEADING_3 = "HEADING_3",
  }
  export enum AlignmentType {
    LEFT = "LEFT",
    CENTER = "CENTER",
    RIGHT = "RIGHT",
  }
  export enum LevelFormat {
    DECIMAL = "DECIMAL",
  }
}
