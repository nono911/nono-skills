const COMMANDS = new Set(['install', 'init', 'update', 'doctor', 'uninstall']);

export const HELP = `nono-skills <command> [options]

Commands:
  install                 Install the engineering Codex plugin
  init [directory]        Add project guidance and agent artifacts
  update                  Update an owned plugin installation
  doctor                  Diagnose the plugin installation
  uninstall               Remove the owned plugin installation

Options:
  --dry-run               Show project changes without writing
  --force                 Back up and replace conflicting project files
  --purge-project <path>  Remove unchanged installed project artifacts
  --version               Print package version
  --help                  Show this help
`;

export function parseArgs(argv) {
  const result = {
    command: 'help', target: undefined, force: false, dryRun: false,
    purgeProject: undefined, help: false, version: false,
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
  while (args.length) {
    const arg = args.shift();
    if (arg === '--force') result.force = true;
    else if (arg === '--dry-run') result.dryRun = true;
    else if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg === '--purge-project') result.purgeProject = args.shift();
    else if (!arg.startsWith('-') && result.command === 'init' && result.target === undefined) result.target = arg;
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
    stdout.write(`${context.version ?? '0.1.0'}\n`);
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
