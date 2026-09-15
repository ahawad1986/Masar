import * as schema from "./schema";
import { database } from "./raw";

export function getDb() {
  return database();
}

export { schema };
