export interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown> | string;
  url?: string;
  headers: {
    authorization?: string;
    [key: string]: string | string[] | undefined;
  };
}

export interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  end(body?: unknown): VercelResponse;
}
