import * as vscode from 'vscode';

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
const writableOperands = [OperandType.Register, OperandType.Label, OperandType.Literal];
const registerOperands = [OperandType.Register];
const literalOperands = [OperandType.Literal];

const mnemonics: { [mnemonic: string]: (OperandType[] | string | vscode.MarkdownString)[] } = {
	"HLT": [[], "## Halt"],
	"NOP": ["No Operation"],
	"JMP": [memLocationOperands, "## Jump Unconditionally"],
	"JEQ": [memLocationOperands, "## Jump If Equal To"],
	"JZO": [memLocationOperands, "## Jump If Zero"],
	"JNE": [memLocationOperands, "## Jump If Not Equal"],
	"JNZ": [memLocationOperands, "## Jump If Not Zero"],
	"JLT": [memLocationOperands, "## Jump If Less Than"],
	"JCA": [memLocationOperands, "## Jump If Carry"],
	"JLE": [memLocationOperands, "## Jump If Less Than or Equal To"],
	"JGT": [memLocationOperands, "## Jump If Greater Than"],
	"JGE": [memLocationOperands, "## Jump If Greater Than or Equal To"],
	"JNC": [memLocationOperands, "## Jump If Not Carry"],
	"ADD": [registerOperands, allOperands, "## Add"],
	"ICR": [registerOperands, "## Increment"],
	"SUB": [registerOperands, allOperands, "## Subtract"],
	"DCR": [registerOperands, "## Decrement"],
	"MUL": [registerOperands, allOperands, "## Multiply"],
	"DIV": [registerOperands, allOperands, "## Divide (Ignore Remainder)"],
	"DVR": [registerOperands, registerOperands, allOperands, "## Divide (With Remainder)"],
	"REM": [registerOperands, allOperands, "## Remainder"],
	"SHL": [registerOperands, allOperands, "## Shift Left"],
	"SHR": [registerOperands, allOperands, "## Shift Right"],
	"AND": [registerOperands, allOperands, "## Bitwise And"],
	"ORR": [registerOperands, allOperands, "## Bitwise Or"],
	"XOR": [registerOperands, allOperands, "## Bitwise Exclusive Or"],
	"NOT": [registerOperands, "## Bitwise Not"],
	"TST": [registerOperands, allOperands, "## Test (Discarded Bitwise And)"],
	"CMP": [registerOperands, allOperands, "## Compare (Discarded Subtraction)"],
	"MVB": [writableOperands, allOperands, "## Move Byte (8-bits)\n\n*Note: If the destination operand is a label or pointer, the source must be a register or literal*"],
	"MVW": [writableOperands, allOperands, "## Move Word (16-bits, 2 bytes)\n\n*Note: If the destination operand is a label or pointer, the source must be a register or literal*"],
	"MVD": [writableOperands, allOperands, "## Move Double Word (32-bits, 4 bytes)\n\n*Note: If the destination operand is a label or pointer, the source must be a register or literal*"],
	"MVQ": [writableOperands, allOperands, "## Move Quad Word (64-bits, 8 bytes)\n\n*Note: If the destination operand is a label or pointer, the source must be a register or literal*"],
	"PSH": [allOperands, "## Push to Stack"],
	"POP": [registerOperands, "## Pop from Stack"],
	"CAL": [memLocationOperands, allOperandsOptional, "## Call Subroutine"],
	"RET": [allOperandsOptional, "## Return from Subroutine"],
	"WCN": [allOperands, "## Write Number (64-bit) to Console"],
	"WCB": [allOperands, "## Write Byte to Console"],
	"WCX": [allOperands, "## Write Byte to Console as Hexadecimal"],
	"WCC": [allOperands, "## Write Byte to Console as Character"],
	"WFN": [allOperands, "## Write Number (64-bit) to File"],
	"WFB": [allOperands, "## Write Byte to File"],
	"WFX": [allOperands, "## Write Byte to File as Hexadecimal"],
	"WFC": [allOperands, "## Write Byte to File as Character"],
	"OFL": [memLocationOperands, "## Open File"],
	"CFL": ["Close File"],
	"DFL": [memLocationOperands, "## Delete File"],
	"RCC": [registerOperands, "## Read Character from Console"],
	"RFC": [registerOperands, "## Read Character from File"],
	"PAD": [literalOperands, "## Pad With 0s"],
	"DAT": [literalOperands, "## Insert Raw Data"]
};

const registers: { [name: string]: string } = {
	"rpo": "## Program Offset",
	"rso": "## Stack Offset",
	"rsb": "## Stack Base",
	"rsf": "## Status Flags\n\n*(Zero Flag, Carry Flag, File End Flag, 61 remaining high bits undefined)*",
	"rrv": "## Return Value",
	"rfp": "## Fast Pass Parameter",
	"rg0": "## General 0",
	"rg1": "## General 1",
	"rg2": "## General 2",
	"rg3": "## General 3",
	"rg4": "## General 4",
	"rg5": "## General 5",
	"rg6": "## General 6",
	"rg7": "## General 7",
	"rg8": "## General 8",
	"rg9": "## General 9"
}

class AssEmblyCompletionItemProvider implements vscode.CompletionItemProvider {
	public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position,
		token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[]> {
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
								m, m == "PAD" || m == "DAT"
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
		let docString = new vscode.MarkdownString();
		// Mnemonics
		if (item.kind == vscode.CompletionItemKind.Keyword || item.kind == vscode.CompletionItemKind.Function) {
			docString.appendMarkdown(mnemonics[item.label.toString()].slice(-1)[0] as string);
			let operandTypes = mnemonics[item.label.toString()].slice(0, -1) as OperandType[][];
			if (operandTypes.length > 0) {
				docString.appendMarkdown("\n\n### Operand Requirements:\n\n");
				for (let i = 0; i < operandTypes.length; i++) {
					docString.appendMarkdown("`");
					for (let j = 0; j < operandTypes[i].length; j++) {
						if (operandTypes[i][j] == OperandType.Optional) {
							docString.appendMarkdown(" (Optional)");
						}
						else {
							docString.appendMarkdown(OperandType[operandTypes[i][j]]);
							if (j < operandTypes[i].length - 1 && operandTypes[i][j + 1] != OperandType.Optional) {
								docString.appendMarkdown(" | ");
							}
						}
					}
					docString.appendMarkdown("`");
					if (i < operandTypes.length - 1) {
						docString.appendMarkdown(", ");
					}
				}
			}
		}
		// Registers
		else if (item.kind == vscode.CompletionItemKind.Variable) {
			docString.appendMarkdown(registers[item.label.toString()]);
		}
		item.documentation = docString;
		return item;
	}
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			{ scheme: 'file', language: 'assembly-tolly' },
			new AssEmblyCompletionItemProvider()
		)
	);
}

export function deactivate() { }
