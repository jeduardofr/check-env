import { Command } from 'commander';
import { promises as fs } from 'fs';
import dotenv from 'dotenv';

import { fileExists } from './utils';
import { getChecker } from './checkers';

function earlyExit(message: string, exitCode = 1) {
	console.error(message);
	process.exitCode = exitCode;
}

async function main() {
	let program = new Command();
	program
		.name('env-differ')
		.option('--source-file <source-file>')
		.option('--env-file <env-file>');

	program.parse();

	const options = program.opts();

	const env_file = options['envFile'] as string;
	const source_file = options['sourceFile'] as string;
	if (!('envFile' in options) || !('sourceFile' in options)) {
		earlyExit("--source-file and --env-file are required");
		return
	}

	let source_file_exists = await fileExists(source_file);
	if (!source_file_exists) {
		earlyExit("source file does not exists");
		return
	}

	let env_file_exists = await fileExists(env_file);
	if (!env_file_exists) {
		earlyExit("env file does not exists");
		return
	}

	const source_code = await fs.readFile(source_file, 'utf8');
	let extension = (() => {
		let parts = source_file.split(".");
		return parts[parts.length - 1];
	})();

	const env_contents = await fs.readFile(env_file, 'utf8');
	const env = dotenv.parse(env_contents);

	let checker = getChecker(extension, env, source_code);
	if (!checker) {
		earlyExit(`no checker found for ${extension}`)
		return
	}

	checker.find();
	let missing_variables = checker.check();
	if (missing_variables.length === 0) {
		console.log("source file and env file are in sync");
		process.exitCode = 0;
	} else {
		let missing_variables_text = missing_variables.map(v => `\t${v}`).join('\n');
		let message = `the following env variables are missing in env file: \n${missing_variables_text}\n`
		earlyExit(message, missing_variables.length);
	}
}

main();
