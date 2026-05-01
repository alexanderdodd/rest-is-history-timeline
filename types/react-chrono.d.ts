// react-chrono v2 ships types at dist/react-chrono.d.ts but package.json
// points "types" at the non-existent dist/index.d.ts. Until upstream fixes
// this, declare the module here and rely on our wrapper for type safety.
declare module "react-chrono" {
  import type { ComponentType } from "react";
  export const Chrono: ComponentType<Record<string, unknown>>;
}
