/** Action entry point */
import fs from "node:fs";

import * as ghCore from "@actions/core";
import axios, { isAxiosError } from "axios";

import { type Access, npmPublish, type Strategy } from "../index.js";
import * as core from "./core.js";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/restrict-template-expressions, unicorn/prevent-abbreviations, unicorn/no-process-exit, unicorn/escape-case*/
/** Validate StepSecurity subscription before running the action. */
async function validateSubscription(): Promise<void> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  let repoPrivate: boolean | undefined;

  if (eventPath && fs.existsSync(eventPath)) {
    const eventData = JSON.parse(fs.readFileSync(eventPath, "utf8"));
    repoPrivate = eventData?.repository?.private;
  }

  const upstream = "js-devtools/npm-publish";
  const action = process.env.GITHUB_ACTION_REPOSITORY;
  const docsUrl =
    "https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions";

  ghCore.info("");
  ghCore.info("\u001b[1;36mStepSecurity Maintained Action\u001b[0m");
  ghCore.info(`Secure drop-in replacement for ${upstream}`);
  if (repoPrivate === false)
    ghCore.info("\u001b[32m✓ Free for public repositories\u001b[0m");
  ghCore.info(`\u001b[36mLearn more:\u001b[0m ${docsUrl}`);
  ghCore.info("");

  if (repoPrivate === false) return;

  const serverUrl = process.env.GITHUB_SERVER_URL || "https://github.com";
  const body: Record<string, string> = { action: action || "" };
  if (serverUrl !== "https://github.com") body.ghes_server = serverUrl;
  try {
    await axios.post(
      `https://agent.api.stepsecurity.io/v1/github/${process.env.GITHUB_REPOSITORY}/actions/maintained-actions-subscription`,
      body,
      { timeout: 3000 }
    );
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      ghCore.error(
        `\u001b[1;31mThis action requires a StepSecurity subscription for private repositories.\u001b[0m`
      );
      ghCore.error(
        `\u001b[31mLearn how to enable a subscription: ${docsUrl}\u001b[0m`
      );
      process.exit(1);
    }
    ghCore.info("Timeout or API not reachable. Continuing to next step.");
  }
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/restrict-template-expressions, unicorn/prevent-abbreviations, unicorn/no-process-exit, unicorn/escape-case*/

/** Run the action. */
async function run(): Promise<void> {
  await validateSubscription();
  const results = await npmPublish({
    token: core.getSecretInput("token"),
    registry: core.getInput("registry"),
    package: core.getInput("package"),
    tag: core.getInput("tag"),
    access: core.getInput("access") as Access | undefined,
    provenance: core.getBooleanInput("provenance"),
    strategy: core.getInput("strategy") as Strategy | undefined,
    ignoreScripts: core.getBooleanInput("ignore-scripts"),
    dryRun: core.getBooleanInput("dry-run"),
    logger: core.logger,
    temporaryDirectory: process.env.RUNNER_TEMP,
  });

  core.setOutput("id", results.id, "");
  core.setOutput("name", results.name);
  core.setOutput("version", results.version);
  core.setOutput("type", results.type, "");
  core.setOutput("old-version", results.oldVersion, "");
  core.setOutput("registry", results.registry.href);
  core.setOutput("tag", results.tag);
  core.setOutput("access", results.access, "default");
  core.setOutput("strategy", results.strategy);
  core.setOutput("dry-run", results.dryRun);
}

/** Main action entry point. */
export async function main(): Promise<void> {
  try {
    await run();
  } catch (error) {
    core.setFailed(error);
  }
}
