/**
 * Meal-parsing eval: runs every case in evals/meals.json through the parser
 * and scores the estimated totals against the reference macros.
 *
 *   pnpm eval:meals              replay the recorded outputs (free, no API key)
 *   pnpm eval:meals --live       call the API (needs ANTHROPIC_API_KEY)
 *   pnpm eval:meals --live --record   call the API and save the outputs for replay
 *
 * Exits 1 when fewer than EVAL_MIN_PASS_RATE (default 0.8) of the cases pass.
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import {
  DEFAULT_MIN_PASS_RATE,
  evalSetSchema,
  formatSummaryMarkdown,
  scoreCase,
  summarize,
  type CaseOutput
} from "@/lib/ai/meal-eval";
import {
  getAiModel,
  MEAL_PARSER_VERSION,
  MealParseError,
  parseMealText
} from "@/lib/ai/meal-parser";
import { costMicroUsd } from "@/lib/ai/pricing";

const CASES_PATH = "evals/meals.json";
const RECORDING_PATH = "evals/recordings/meal-parse.json";
const CONCURRENCY = 4;

type Recording = {
  promptVersion: string;
  model: string;
  recordedAt: string;
  outputs: Record<string, CaseOutput>;
};

const args = new Set(process.argv.slice(2));
const live = args.has("--live");
const record = args.has("--record");
const minPassRate = Number(process.env.EVAL_MIN_PASS_RATE) || DEFAULT_MIN_PASS_RATE;

const cases = evalSetSchema.parse(JSON.parse(readFileSync(CASES_PATH, "utf8")));

async function runLive() {
  const model = getAiModel();
  const outputs: Record<string, CaseOutput> = {};
  let microUsd = 0;
  let next = 0;

  async function worker() {
    while (next < cases.length) {
      const testCase = cases[next];
      next += 1;

      try {
        const result = await parseMealText(testCase.text, { model });
        outputs[testCase.id] = { meal: result.meal };
        microUsd += costMicroUsd(result.model, result.usage);
      } catch (error) {
        outputs[testCase.id] = {
          error: error instanceof MealParseError ? error.reason : `api: ${(error as Error).message}`
        };
      }
      process.stdout.write(".");
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write("\n");

  return { model, outputs, costUsd: microUsd / 1_000_000 };
}

function readRecording(): Recording | null {
  if (!existsSync(RECORDING_PATH)) {
    return null;
  }

  return JSON.parse(readFileSync(RECORDING_PATH, "utf8")) as Recording;
}

async function main() {
  let model: string;
  let outputs: Record<string, CaseOutput>;
  let costUsd: number | undefined;

  if (live) {
    ({ model, outputs, costUsd } = await runLive());

    if (record) {
      const recording: Recording = {
        promptVersion: MEAL_PARSER_VERSION,
        model,
        recordedAt: new Date().toISOString(),
        outputs
      };
      writeFileSync(RECORDING_PATH, `${JSON.stringify(recording, null, 2)}\n`);
      console.log(`Saved outputs to ${RECORDING_PATH}`);
    }
  } else {
    const recording = readRecording();

    if (!recording) {
      console.log(`No recording at ${RECORDING_PATH} yet. Run \`pnpm eval:meals --live --record\` with an API key.`);
      return;
    }

    if (recording.promptVersion !== MEAL_PARSER_VERSION) {
      console.error(
        `The recording is for ${recording.promptVersion} but the parser is ${MEAL_PARSER_VERSION}. Re-record it with \`pnpm eval:meals --live --record\`.`
      );
      process.exitCode = 1;
      return;
    }

    ({ model, outputs } = recording);
  }

  const summary = summarize(cases.map((testCase) => scoreCase(testCase, outputs[testCase.id])));
  const markdown = formatSummaryMarkdown(summary, {
    model,
    mode: live ? "live" : "recorded",
    costUsd
  });

  console.log(markdown);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
  }

  if (summary.passRate < minPassRate) {
    console.error(`Pass rate ${Math.round(summary.passRate * 100)}% is below ${Math.round(minPassRate * 100)}%.`);
    process.exitCode = 1;
  }
}

void main();
