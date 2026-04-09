declare module "sanitize-html" {
  type IOptions = {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
  };

  export default function sanitizeHtml(dirty: string, options?: IOptions): string;
}
