const COMMANDS = new Set(['install', 'init', 'update', 'doctor', 'agents', 'runs', 'insights', 'eval', 'uninstall']);
const AGENT_COMMANDS = new Set(['list', 'setup', 'enable', 'disable', 'policy', 'doctor']);
const AGENT_POLICIES = new Set(['review-only', 'isolated-writer']);
const RUN_COMMANDS = new Set(['list', 'show', 'purge']);
const EVAL_COMMANDS = new Set(['validate', 'cases', 'score']);

export const HELP = `nono-skills <command> [options]

Commands:
  install                 Install the engineering Codex plugin
  init [directory]        Add repository guidance and a reviewer agent
  update                  Update an owned plugin installation
  doctor                  Diagnose the plugin installation
  agents [command]        Inspect or configure optional local agent CLIs
  runs [command]          Inspect or purge repository-local loop evidence
  insights [directory]    Show evidence-backed local run recommendations
  eval [command]          Validate or score host skill-activation results
  uninstall               Remove the owned plugin installation

Agent commands:
  agents list             Show detected providers and configuration
  agents setup            Prefer every detected compatible provider
  agents enable <name>    Prefer a provider for delivery-loop proposals
  agents disable <name>   Exclude a provider from delivery-loop proposals
  agents policy <name> <review-only|isolated-writer>
                          Restrict the durable role policy for a provider
  agents doctor           Diagnose optional provider configuration

Run commands:
  runs list [directory]   List controlled runs for a repository
  runs show <id> [directory]
                          Show one run and its evidence chain
  runs purge [directory] --force
                          Remove package-owned local run evidence

Eval commands:
  eval validate           Validate the packaged 90-case corpus
  eval cases              Print provider-neutral cases as JSONL
  eval score <results>    Score captured host results and show activation metrics

Options:
  --dry-run               Show project changes without writing
  --force                 Back up and replace conflicting project files
  --purge-project <path>  Remove unchanged installed project artifacts
  --allow-missing         Permit an explicitly exploratory partial eval
  --json                  Print the full eval report and confusion matrix
  --version               Print package version
  --help                  Show this help
`;

export function parseArgs(argv) {
  const result = {
    command: 'help', target: undefined, force: false, dryRun: false,
    purgeProject: undefined, agentCommand: undefined, provider: undefined, agentPolicy: undefined,
    runCommand: undefined, runId: undefined,
    help: false, version: false,
  };
  const args = [...argv];
  if (args.length === 0) {
    result.help = true;
    return result;
  }
  if (args[0] === '--version') {
    result.command = 'version';
    result.version = true;
    return result;
  }
  if (args[0] === '--help' || args[0] === '-h') {
    result.help = true;
    return result;
  }
  result.command = args.shift();
  if (result.command === 'agents') {
    result.agentCommand = args.shift() ?? 'list';
    if (result.agentCommand === '--help' || result.agentCommand === '-h') {
      result.help = true;
      return result;
    }
    if (!AGENT_COMMANDS.has(result.agentCommand)) {
      throw new Error(`Unknown agents command: ${result.agentCommand}`);
    }
    if (['enable', 'disable', 'policy'].includes(result.agentCommand)) {
      result.provider = args.shift();
      if (!result.provider) throw new Error(`agents ${result.agentCommand} requires a provider`);
    }
    if (result.agentCommand === 'policy') {
      result.agentPolicy = args.shift();
      if (!result.agentPolicy) throw new Error('agents policy requires a policy');
      if (!AGENT_POLICIES.has(result.agentPolicy)) {
        throw new Error(`Unknown external agent policy: ${result.agentPolicy}`);
      }
    }
  }
  if (result.command === 'runs') {
    result.runCommand = args.shift() ?? 'list';
    if (result.runCommand === '--help' || result.runCommand === '-h') {
      result.help = true;
      return result;
    }
    if (!RUN_COMMANDS.has(result.runCommand)) {
      throw new Error(`Unknown runs command: ${result.runCommand}`);
    }
    if (result.runCommand === 'show') {
      result.runId = args.shift();
      if (!result.runId) throw new Error('runs show requires a run ID');
    }
  }
  if (result.command === 'eval') {
    result.evalCommand = args.shift() ?? 'validate';
    if (result.evalCommand === '--help' || result.evalCommand === '-h') {
      result.help = true;
      return result;
    }
    if (!EVAL_COMMANDS.has(result.evalCommand)) {
      throw new Error(`Unknown eval command: ${result.evalCommand}`);
    }
    if (result.evalCommand === 'score') {
      result.resultsFile = args.shift();
      if (!result.resultsFile) throw new Error('eval score requires a results file');
    }
  }
  while (args.length) {
    const arg = args.shift();
    if (arg === '--force') result.force = true;
    else if (arg === '--dry-run') result.dryRun = true;
    else if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg === '--purge-project') result.purgeProject = args.shift();
    else if (arg === '--allow-missing' && result.command === 'eval') result.allowMissing = true;
    else if (arg === '--json' && result.command === 'eval') result.json = true;
    else if (
      !arg.startsWith('-')
      && ['init', 'runs', 'insights'].includes(result.command)
      && result.target === undefined
    ) result.target = arg;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return result;
}

export async function run(argv, context) {
  const stdout = context.stdout ?? process.stdout;
  const stderr = context.stderr ?? process.stderr;
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 1;
  }
  if (options.version) {
    const version = context.packageVersion ?? context.version;
    if (version === undefined) {
      stderr.write('Package version is unavailable\n');
      return 1;
    }
    stdout.write(`${version}\n`);
    return 0;
  }
  if (options.help) {
    stdout.write(HELP);
    return 0;
  }
  if (!COMMANDS.has(options.command)) {
    stderr.write(`Unknown command: ${options.command}\n`);
    return 1;
  }
  const handler = context.handlers?.[options.command];
  if (!handler) {
    stderr.write(`Command is not available: ${options.command}\n`);
    return 1;
  }
  try {
    return await handler(options, context);
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 1;
  }
}
