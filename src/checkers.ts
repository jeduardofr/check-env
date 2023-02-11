import Parser from 'tree-sitter';
import type {DotenvParseOutput} from 'dotenv';
const typescript = require('tree-sitter-typescript').typescript;

export abstract class IChecker {
	protected _variables: string[] = [];
	protected _parser: Parser;
	protected _tree_node: Parser.Tree;
	protected _root_node: Parser.SyntaxNode;
	protected _env: DotenvParseOutput;

	constructor(
		source_code: string,
		env: DotenvParseOutput,
		language: any,
	) {
		this._parser = new Parser();
		this._parser.setLanguage(language);
		this._tree_node = this._parser.parse(source_code);
		this._root_node = this._tree_node.rootNode;
		this._env = env;
	}

	// Computes the variables missing from the env file and the ones that appear in the source file
	check(): string[] {
		let missing_variables = [] as string[];

		for (let env_variable of this._variables) {
			if (!(env_variable in this._env)) {
				missing_variables.push(env_variable);
			}
		}

		return missing_variables;
	}

	abstract find(): void;
}

class GoChecker extends IChecker {
	find() {}
}

class TypeScriptChecker extends IChecker {
	private _visit(node: Parser.SyntaxNode) {
		if (node.type === "member_expression") {
			let cursor = node.walk();
			let member_expression_text = cursor.nodeText;

			// If we're on member_expression that starts with 'process.env', it means the current node
			// is an access to an environment variable. At this point, we're at the outer most member
			// expression
			if (member_expression_text.startsWith("process.env")) {
				// In this case, we don't keep visiting the childs from this member expression
				let parts = member_expression_text.split('.');
				let variable = parts[parts.length - 1];
				this._variables.push(variable);
				return
			}
		}

		for (let child of node.children) {
			this._visit(child);
		}
	}

	find() {
		this._visit(this._root_node);
	}

}

export function getChecker(
	extension: string,
	env: DotenvParseOutput,
	source_code: string
): IChecker | null {
	switch (extension) {
		case 'ts':
			return new TypeScriptChecker(source_code, env, typescript);
		case 'go':
			return new GoChecker(source_code, env, typescript);
		default:
			return null;
	}
}
