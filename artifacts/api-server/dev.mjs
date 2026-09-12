import { spawn } from "node:child_process";

const env = {
  ...process.env,
  NODE_ENV: "development",
  PORT: process.env.PORT ?? "5000",
};

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} was terminated by ${signal}`));
        return;
      }

      resolve(code ?? 1);
    });
  });
}

const buildExitCode = await run(process.execPath, ["./build.mjs"]);

if (buildExitCode !== 0) {
  process.exit(buildExitCode);
}

const serverExitCode = await run(process.execPath, [
  "--env-file=../../.env",
  "--enable-source-maps",
  "./dist/index.mjs",
]);

process.exit(serverExitCode);
