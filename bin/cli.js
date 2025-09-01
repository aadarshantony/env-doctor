import { program } from "commander";
import { diagnose } from "../src/diagnose.js";
import chalk from "chalk";
program
    .command('diagnose')
    .description(chalk.cyan('Diagnose and audit your environment variables in seconds.'))
    .action((options) => {
        diagnose(options.envfile);
    });

program.parse(process.argv)