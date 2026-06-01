/**
 * Bundled action entry point — invokes main() so action.yaml can point at dist/
 * directly.
 */
import { main } from "./main.js";

await main();
