declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    MADAR_OWNER_EMAIL?: string;
  }
}
