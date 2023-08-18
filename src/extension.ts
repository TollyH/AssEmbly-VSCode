import * as vscode from 'vscode';
import * as child_process from 'child_process';

enum OperandType {
	Register,
	Literal,
	Label,
	Pointer,
	Optional
}

const allOperands = [OperandType.Register, OperandType.Literal, OperandType.Label, OperandType.Pointer];
const allOperandsOptional = [OperandType.Register, OperandType.Literal, OperandType.Label, OperandType.Pointer, OperandType.Optional];
const memLocationOperands = [OperandType.Label, OperandType.Pointer];
const writableOperands = [OperandType.Register, OperandType.Label, OperandType.Pointer];
const registerOperands = [OperandType.Register];
const literalOperands = [OperandType.Literal];

class MnemonicInfo {
	public operandCombinations: OperandType[][]
	public description: string;

	constructor(operandCombinations: OperandType[][], description: string) {
		this.operandCombinations = operandCombinations;
		this.description = description;
	}
}

const mnemonics: { [mnemonic: string]: MnemonicInfo } = {
	"HLT": new MnemonicInfo([], "## Halt"),
	"NOP": new MnemonicInfo([], "## No Operation"),
	"JMP": new MnemonicInfo([memLocationOperands], "## Jump Unconditionally"),
	"JEQ": new MnemonicInfo([memLocationOperands], "## Jump If Equal To"),
	"JZO": new MnemonicInfo([memLocationOperands], "## Jump If Zero"),
	"JNE": new MnemonicInfo([memLocationOperands], "## Jump If Not Equal"),
	"JNZ": new MnemonicInfo([memLocationOperands], "## Jump If Not Zero"),
	"JLT": new MnemonicInfo([memLocationOperands], "## Jump If Less Than"),
	"JCA": new MnemonicInfo([memLocationOperands], "## Jump If Carry"),
	"JLE": new MnemonicInfo([memLocationOperands], "## Jump If Less Than or Equal To"),
	"JGT": new MnemonicInfo([memLocationOperands], "## Jump If Greater Than"),
	"JGE": new MnemonicInfo([memLocationOperands], "## Jump If Greater Than or Equal To"),
	"JNC": new MnemonicInfo([memLocationOperands], "## Jump If Not Carry"),
	"ADD": new MnemonicInfo([registerOperands, allOperands], "## Add"),
	"ICR": new MnemonicInfo([registerOperands], "## Increment"),
	"SUB": new MnemonicInfo([registerOperands, allOperands], "## Subtract"),
	"DCR": new MnemonicInfo([registerOperands], "## Decrement"),
	"MUL": new MnemonicInfo([registerOperands, allOperands], "## Multiply"),
	"DIV": new MnemonicInfo([registerOperands, allOperands], "## Divide (Ignore Remainder)"),
	"DVR": new MnemonicInfo([registerOperands, registerOperands, allOperands], "## Divide (With Remainder)"),
	"REM": new MnemonicInfo([registerOperands, allOperands], "## Remainder"),
	"SHL": new MnemonicInfo([registerOperands, allOperands], "## Shift Left"),
	"SHR": new MnemonicInfo([registerOperands, allOperands], "## Shift Right"),
	"AND": new MnemonicInfo([registerOperands, allOperands], "## Bitwise And"),
	"ORR": new MnemonicInfo([registerOperands, allOperands], "## Bitwise Or"),
	"XOR": new MnemonicInfo([registerOperands, allOperands], "## Bitwise Exclusive Or"),
	"NOT": new MnemonicInfo([registerOperands], "## Bitwise Not"),
	"RNG": new MnemonicInfo([registerOperands], "## Random Number"),
	"TST": new MnemonicInfo([registerOperands, allOperands], "## Test (Discarded Bitwise And)"),
	"CMP": new MnemonicInfo([registerOperands, allOperands], "## Compare (Discarded Subtraction)"),
	"MVB": new MnemonicInfo([writableOperands, allOperands], "## Move Byte (8-bits)\n\n*Note: If the destination operand is a label or pointer, the source must be a register or literal*"),
	"MVW": new MnemonicInfo([writableOperands, allOperands], "## Move Word (16-bits, 2 bytes)\n\n*Note: If the destination operand is a label or pointer, the source must be a register or literal*"),
	"MVD": new MnemonicInfo([writableOperands, allOperands], "## Move Double Word (32-bits, 4 bytes)\n\n*Note: If the destination operand is a label or pointer, the source must be a register or literal*"),
	"MVQ": new MnemonicInfo([writableOperands, allOperands], "## Move Quad Word (64-bits, 8 bytes)\n\n*Note: If the destination operand is a label or pointer, the source must be a register or literal*"),
	"PSH": new MnemonicInfo([allOperands], "## Push to Stack"),
	"POP": new MnemonicInfo([registerOperands], "## Pop from Stack"),
	"CAL": new MnemonicInfo([memLocationOperands, allOperandsOptional], "## Call Subroutine"),
	"RET": new MnemonicInfo([allOperandsOptional], "## Return from Subroutine"),
	"WCN": new MnemonicInfo([allOperands], "## Write Number (64-bit) to Console"),
	"WCB": new MnemonicInfo([allOperands], "## Write Byte to Console"),
	"WCX": new MnemonicInfo([allOperands], "## Write Byte to Console as Hexadecimal"),
	"WCC": new MnemonicInfo([allOperands], "## Write Byte to Console as Character"),
	"WFN": new MnemonicInfo([allOperands], "## Write Number (64-bit) to File"),
	"WFB": new MnemonicInfo([allOperands], "## Write Byte to File"),
	"WFX": new MnemonicInfo([allOperands], "## Write Byte to File as Hexadecimal"),
	"WFC": new MnemonicInfo([allOperands], "## Write Byte to File as Character"),
	"OFL": new MnemonicInfo([memLocationOperands], "## Open File"),
	"CFL": new MnemonicInfo([], "## Close File"),
	"DFL": new MnemonicInfo([memLocationOperands], "## Delete File"),
	"FEX": new MnemonicInfo([registerOperands, memLocationOperands], "## File Exists?"),
	"FSZ": new MnemonicInfo([registerOperands, memLocationOperands], "## Get File Size"),
	"RCC": new MnemonicInfo([registerOperands], "## Read Character from Console"),
	"RFC": new MnemonicInfo([registerOperands], "## Read Character from File"),
	"PAD": new MnemonicInfo([literalOperands], "## Pad With 0s"),
	"DAT": new MnemonicInfo([literalOperands], "## Insert Raw Byte"),
	"NUM": new MnemonicInfo([literalOperands], "## Insert Raw Quad Word (64-bits, 8 bytes)"),
	"IMP": new MnemonicInfo([literalOperands], "## Import File Contents"),
	"MAC": new MnemonicInfo([], "## Define Macro\n\n*Note: Macros take two operands, but they can be any arbitrary text, they do not have to be of a defined operand type*"),
	"ANALYZER": new MnemonicInfo([], "## Toggle Assembler Warning\n\nFirst operand is one of `error`, `warning`, or `suggestion`.\n\nSecond operand is the numerical code of the message\n\nThe third operand is one of `0`, `1`, or `r`.")
};

const registers: { [name: string]: string } = {
	"rpo": "Program Offset",
	"rso": "Stack Offset",
	"rsb": "Stack Base",
	"rsf": "Status Flags\n\n*(Zero Flag, Carry Flag, File End Flag, 61 remaining high bits undefined)*",
	"rrv": "Return Value",
	"rfp": "Fast Pass Parameter",
	"rg0": "General 0",
	"rg1": "General 1",
	"rg2": "General 2",
	"rg3": "General 3",
	"rg4": "General 4",
	"rg5": "General 5",
	"rg6": "General 6",
	"rg7": "General 7",
	"rg8": "General 8",
	"rg9": "General 9"
}

const directives = ["PAD", "DAT", "NUM", "IMP", "MAC", "ANALYZER"];

function generateMnemonicDescription(mnemonicName: string): vscode.MarkdownString {
	let docString = new vscode.MarkdownString();
	docString.appendMarkdown(mnemonics[mnemonicName].description);
	let operandCombinations = mnemonics[mnemonicName].operandCombinations;
	if (operandCombinations.length > 0) {
		docString.appendMarkdown("\n\n### Operand Requirements:\n\n");
		for (let i = 0; i < operandCombinations.length; i++) {
			docString.appendMarkdown("`");
			for (let j = 0; j < operandCombinations[i].length; j++) {
				if (operandCombinations[i][j] == OperandType.Optional) {
					docString.appendMarkdown(" (Optional)");
				}
				else {
					docString.appendMarkdown(OperandType[operandCombinations[i][j]]);
					if (j < operandCombinations[i].length - 1 && operandCombinations[i][j + 1] != OperandType.Optional) {
						docString.appendMarkdown(" | ");
					}
				}
			}
			docString.appendMarkdown("`");
			if (i < operandCombinations.length - 1) {
				docString.appendMarkdown(", ");
			}
		}
	}
	return docString;
}

function generateRegisterDescription(registerName: string): vscode.MarkdownString {
	let docString = new vscode.MarkdownString();
	docString.appendMarkdown("## Register:\n### ");
	docString.appendMarkdown(registers[registerName.toString()]);
	return docString;
}

class AssEmblyCompletionItemProvider implements vscode.CompletionItemProvider {
	public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[]> {
		let completionItems: vscode.CompletionItem[] = [];
		let beforeCursor = document.lineAt(position.line).text.slice(0, position.character).toUpperCase();
		// Don't autocorrect label definitions or comments
		if (beforeCursor[0] != ':' && !beforeCursor.includes(';')) {
			// If this is the first word in the line
			if (!beforeCursor.includes(' ')) {
				for (let m in mnemonics) {
					if (m.startsWith(beforeCursor)) {
						completionItems.push(
							new vscode.CompletionItem(
								m, directives.find(x => x == m) !== undefined
								? vscode.CompletionItemKind.Keyword
								: vscode.CompletionItemKind.Function
							)
						);
					}
				}
			}
			else {
				let activeParameter = beforeCursor.split(' ').slice(-1)[0].split(',').slice(-1)[0];
				// If not a label or numeral
				if (activeParameter[0] != ':' && (activeParameter[0] < '0' || activeParameter[0] > '9')) {
					// Ignore pointer symbol
					if (activeParameter[0] == '*') {
						activeParameter = activeParameter.slice(1);
					}
					for (let r in registers) {
						if (r.toUpperCase().startsWith(activeParameter)) {
							completionItems.push(
								new vscode.CompletionItem(
									r, vscode.CompletionItemKind.Variable
								)
							);
						}
					}
				}
			}
		}
		return completionItems;
	}

	public resolveCompletionItem(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
		// Provides documentation on the selected operand in the code completion window
		// Mnemonics
		if (item.kind == vscode.CompletionItemKind.Keyword || item.kind == vscode.CompletionItemKind.Function) {
			item.documentation = generateMnemonicDescription(item.label.toString());
		}
		// Registers
		else if (item.kind == vscode.CompletionItemKind.Variable) {
			item.documentation = generateRegisterDescription(item.label.toString());
		}
		return item;
	}
}

class AssEmblyHoverProvider implements vscode.HoverProvider {
	public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
		let line = document.lineAt(position.line).text;
		// If cursor is in the middle of a parameter consider the whole parameter
		let commaIndex = line.indexOf(',', position.character);
		let spaceIndex = line.indexOf(' ', position.character);
		let endIndex;
		if (commaIndex != -1 && spaceIndex != -1) {
			endIndex = Math.min(commaIndex, spaceIndex);
		}
		else if (commaIndex != -1) {
			endIndex = commaIndex;
		}
		else if (spaceIndex != -1) {
			endIndex = spaceIndex;
		}
		else {
			endIndex = line.length;
		}
		let beforeCursor = line.slice(0, endIndex).toUpperCase();
		// Don't provide hover for comments, strings, or empty lines
		if (beforeCursor.includes(';') || beforeCursor.includes('"') || beforeCursor.trimStart().length == 0) {
			return null;
		}
		// Mnemonic
		if (!beforeCursor.includes(' ') && mnemonics[beforeCursor] != undefined) {
			return new vscode.Hover(generateMnemonicDescription(beforeCursor));
		}
		let activeParameter = beforeCursor.split(' ').slice(-1)[0].split(',').slice(-1)[0];
		let registerOpFormat = activeParameter.replace(/^\*/, '').toLowerCase();
		// Register
		if (registers[registerOpFormat] != undefined) {
			let hoverString = generateRegisterDescription(registerOpFormat);
			if (activeParameter[0] == '*') {
				hoverString.appendMarkdown("\n\n*`\*`: Register contents will be treated as a pointer to address in memory*");
			}
			return new vscode.Hover(hoverString);
		}
		// Label reference
		if (beforeCursor.includes(' ') && activeParameter[0] == ":") {
			let hoverString = new vscode.MarkdownString("## Label Reference");
			if (activeParameter.length > 1 && activeParameter[1] == '&') {
				hoverString.appendMarkdown("\n\n*`&`: Address corresponding to label will be treated as a literal numeric value*")
			}
			return new vscode.Hover(hoverString);
		}
		// Label definition
		if (activeParameter[0] == ":") {
			return new vscode.Hover("## Label Definition");
		}
		// Numeric literal
		if (activeParameter[0] >= '0' && activeParameter[0] <= '9') {
			let hoverString = new vscode.MarkdownString("## Numeric Literal");
			if (activeParameter.startsWith("0X")) {
				hoverString.appendMarkdown("\n\n*`0x`: Hexadecimal number*");
			}
			else if (activeParameter.startsWith("0B")) {
				hoverString.appendMarkdown("\n\n*`0b`: Binary number*");
			}
			return new vscode.Hover(hoverString);
		}
		return new vscode.Hover(new vscode.MarkdownString("## Invalid\n\nUnless this is the name of a defined macro or is within a macro definition"));
	}
}

function updateDiagnostics(collection: vscode.DiagnosticCollection) {
	for (let d = 0; d < vscode.workspace.textDocuments.length; d++) {
		let document = vscode.workspace.textDocuments[d];
		if (document && document.languageId === "assembly-tolly") {
			let warnings;
			child_process.exec(
				`${vscode.workspace.getConfiguration().get('AssEmblyTolly.linterPath')} lint "${document.uri.fsPath.replace(/"/g, '\\"')}" --no-header`,
				async (err, stdout, _) => {
					try {
						console.log(`AssEmbly linter: attempting to decode "${stdout.trim()}"`)
						warnings = JSON.parse(stdout);
					}
					catch {
						warnings = null;
					}
					if (warnings !== null && !Array.isArray(warnings) && "error" in warnings) {
						console.log('Error from AssEmbly while linting: ' + warnings["error"]);
						return;
					}
					if (err) {
						console.log(
							'Unexpected error launching AssEmbly executable: ' + err
							+ ' The following may provide some info: ' + stdout);
						return;
					}
					if (warnings === null) {
						console.log("An unknown error occurred during AssEmbly linting");
						return;
					}

					let warningArray: any[] = warnings;
					let newDiagnostics: any = {};
					for (let i = 0; i < warningArray.length; i++) {
						let warning = warningArray[i];
						let path = warning["File"];
						path = path === "" ? document.uri.fsPath : path;
						let lineIndex = warning["Line"] - 1;
						let severity = warning["Severity"];
						let diagnosticSeverity = severity === 0 || severity === 1
							? vscode.DiagnosticSeverity.Error
							: severity === 2
								? vscode.DiagnosticSeverity.Warning
								: vscode.DiagnosticSeverity.Information;
						let messageStart = severity === 0
						? "Fatal Error"
						: severity === 1
							? `Error ${String(warning["Code"]).padStart(4, '0')}`
							: severity === 2
								? `Warning ${String(warning["Code"]).padStart(4, '0')}`
								: `Suggestion ${String(warning["Code"]).padStart(4, '0')}`;
						if (!(path in newDiagnostics)) {
							newDiagnostics[path] = [];
						}
						let doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path));
						let lineLength = doc.lineAt(lineIndex).text.length;
						newDiagnostics[path].push(new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, lineLength),
							`${messageStart}: ${warning["Message"]}`, diagnosticSeverity));
					}
					for (let path in newDiagnostics) {
						collection.set(vscode.Uri.file(path), newDiagnostics[path]);
					}
				}
			);
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{ scheme: 'file', language: 'assembly-tolly' },
			new AssEmblyCompletionItemProvider()
		)
	);

	context.subscriptions.push(
		vscode.languages.registerHoverProvider(
			{ scheme: 'file', language: 'assembly-tolly' },
			new AssEmblyHoverProvider()
		)
	);

	let diagnosticCollection = vscode.languages.createDiagnosticCollection('AssEmblyLint');
	context.subscriptions.push(diagnosticCollection);

	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(_ => {
		updateDiagnostics(diagnosticCollection);
	}));
	context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(_ => {
		updateDiagnostics(diagnosticCollection);
	}));
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(_ => {
		updateDiagnostics(diagnosticCollection);
	}));
	updateDiagnostics(diagnosticCollection);
}

export function deactivate() { }
