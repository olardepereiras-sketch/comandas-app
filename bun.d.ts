declare module "bun" {
  export interface ServeOptions {
    fetch: (request: Request) => Response | Promise<Response>;
    port?: number;
    hostname?: string;
    development?: boolean;
    error?: (error: Error) => Response | Promise<Response>;
    tls?: {
      key?: string;
      cert?: string;
    };
  }

  export function serve(options: ServeOptions): void;
}
