import { exitCodeFor, printIssues } from './contract.mjs';
import { validateAllSchemas } from './validate-config.mjs';
import { validateRealSources } from './validate-sources.mjs';

const sourceResult = validateRealSources();
const issues = [...sourceResult.issues, ...validateAllSchemas()];
printIssues(issues);
const code = exitCodeFor(issues);
if (code === 0) {
    process.stdout.write(`atlas validation: PASS nodes=${sourceResult.graph.nodes.length} records=${sourceResult.graph.records.length} activePairs=${sourceResult.graph.topology.length} schemas=4\n`);
}
process.exitCode = code;
