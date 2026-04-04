const pkg = require("../package.json");
const readline = require("readline");
const { execFileSync } = require("child_process");

// --- Constants ---

const RANGE_PREFIXES = new Set(["^", "~"]);

const MANAGER_COMMANDS = {
  npm: { remove: "uninstall", add: "install" },
  yarn: { remove: "remove", add: "add" },
  pnpm: { remove: "remove", add: "add" },
};

// --- Main ---

const devPkgs = getPackagesWithRanges(pkg.devDependencies);

const prodPkgs = getPackagesWithRanges(pkg.dependencies);

const allPkgs = [...new Set([...devPkgs, ...prodPkgs])];

if (!allPkgs.length) {
  console.info("⚪ Package updates not detected.");
} else {
  const userAgent = process.env.npm_config_user_agent ?? "";

  const manager = userAgent.split(" ")[0]?.split("/")[0]?.toLowerCase();

  const { remove, add } = MANAGER_COMMANDS[manager];

  const steps = [
    allPkgs.length && [remove, ...allPkgs],
    devPkgs.length && [add, "-D", ...devPkgs],
    prodPkgs.length && [add, ...prodPkgs],
  ].filter(Boolean);

  process.stdout.write("🟠 Package updates in-progress...");

  try {
    for (const args of steps) {
      execFileSync(manager, args, {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
    }
    clearStatusLine();
    console.info("🟢 Package updates success.");
  } catch (err) {
    clearStatusLine();
    console.error(`🔴 Package updates failed ("${err}").`);
    if (err?.stdout) console.error(String(err.stdout).trim());
    if (err?.stderr) console.error(String(err.stderr).trim());
  }
}

// --- Helpers ---

function getPackagesWithRanges(deps = {}) {
  return Object.entries(deps)
    .filter(([, version]) => RANGE_PREFIXES.has(version.charAt(0)))
    .map(([name]) => name);
}

function clearStatusLine() {
  if (!process.stdout.isTTY) return;
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
}
