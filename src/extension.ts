import * as vscode from 'vscode';
import * as child_process from 'child_process';

enum OperandType {
	Register,
	Literal,
	Address,
	Pointer,
	String,
	Special,
	Optional
}

const allOperands = [OperandType.Register, OperandType.Literal, OperandType.Address, OperandType.Pointer];
const allOperandsOptional = [OperandType.Register, OperandType.Literal, OperandType.Address, OperandType.Pointer, OperandType.Optional];
const memLocationOperands = [OperandType.Address, OperandType.Pointer];
const writableOperands = [OperandType.Register, OperandType.Address, OperandType.Pointer];
const registerOperands = [OperandType.Register];
const literalOperands = [OperandType.Literal];
const literalOperandsOptional = [OperandType.Literal, OperandType.Optional];
const literalOrStringOperands = [OperandType.Literal, OperandType.String];
const stringOperands = [OperandType.String];
const stringOperandsOptional = [OperandType.String, OperandType.Optional];
const specialOperands = [OperandType.Special];
const specialOperandsOptional = [OperandType.Special, OperandType.Optional];
const specialLiteralOperands = [OperandType.Special, OperandType.Literal];

class MnemonicInfo {
	public operandCombinations: OperandType[][];
	public extensionSet: string;
	public description: string;

	constructor(operandCombinations: OperandType[][], extensionSet: string, description: string) {
		this.operandCombinations = operandCombinations;
		this.extensionSet = extensionSet;
		this.description = description;
	}
}

const mnemonics: { [mnemonic: string]: MnemonicInfo } = {
	// Base instruction set
	"HLT": new MnemonicInfo([], "Base Instruction Set", "## Halt"),
	"NOP": new MnemonicInfo([], "Base Instruction Set", "## No Operation"),
	"JMP": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Jump Unconditionally"),
	"JEQ": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Jump If Equal To"),
	"JZO": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Jump If Zero"),
	"JNE": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Jump If Not Equal"),
	"JNZ": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Jump If Not Zero"),
	"JLT": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Jump If Less Than"),
	"JCA": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Jump If Carry"),
	"JLE": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Jump If Less Than or Equal To"),
	"JGT": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Jump If Greater Than"),
	"JGE": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Jump If Greater Than or Equal To"),
	"JNC": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Jump If Not Carry"),
	"ADD": new MnemonicInfo([registerOperands, allOperands], "Base Instruction Set", "## Add"),
	"ICR": new MnemonicInfo([registerOperands], "Base Instruction Set", "## Increment"),
	"SUB": new MnemonicInfo([registerOperands, allOperands], "Base Instruction Set", "## Subtract"),
	"DCR": new MnemonicInfo([registerOperands], "Base Instruction Set", "## Decrement"),
	"MUL": new MnemonicInfo([registerOperands, allOperands], "Base Instruction Set", "## Multiply"),
	"DIV": new MnemonicInfo([registerOperands, allOperands], "Base Instruction Set", "## Divide (Ignore Remainder)"),
	"DVR": new MnemonicInfo([registerOperands, registerOperands, allOperands], "Base Instruction Set", "## Divide (With Remainder)"),
	"REM": new MnemonicInfo([registerOperands, allOperands], "Base Instruction Set", "## Remainder"),
	"SHL": new MnemonicInfo([registerOperands, allOperands], "Base Instruction Set", "## Shift Left"),
	"SHR": new MnemonicInfo([registerOperands, allOperands], "Base Instruction Set", "## Shift Right"),
	"AND": new MnemonicInfo([registerOperands, allOperands], "Base Instruction Set", "## Bitwise And"),
	"ORR": new MnemonicInfo([registerOperands, allOperands], "Base Instruction Set", "## Bitwise Or"),
	"XOR": new MnemonicInfo([registerOperands, allOperands], "Base Instruction Set", "## Bitwise Exclusive Or"),
	"NOT": new MnemonicInfo([registerOperands], "Base Instruction Set", "## Bitwise Not"),
	"RNG": new MnemonicInfo([registerOperands], "Base Instruction Set", "## Random Number"),
	"TST": new MnemonicInfo([registerOperands, allOperands], "Base Instruction Set", "## Test (Discarded Bitwise And)"),
	"CMP": new MnemonicInfo([registerOperands, allOperands], "Base Instruction Set", "## Compare (Discarded Subtraction)"),
	"MVB": new MnemonicInfo([writableOperands, allOperands], "Base Instruction Set", "## Move Byte (8-bits)\n\n*Note: If the destination operand is an address or pointer, the source must be a register or literal*"),
	"MVW": new MnemonicInfo([writableOperands, allOperands], "Base Instruction Set", "## Move Word (16-bits, 2 bytes)\n\n*Note: If the destination operand is an address or pointer, the source must be a register or literal*"),
	"MVD": new MnemonicInfo([writableOperands, allOperands], "Base Instruction Set", "## Move Double Word (32-bits, 4 bytes)\n\n*Note: If the destination operand is an address or pointer, the source must be a register or literal*"),
	"MVQ": new MnemonicInfo([writableOperands, allOperands], "Base Instruction Set", "## Move Quad Word (64-bits, 8 bytes)\n\n*Note: If the destination operand is an address or pointer, the source must be a register or literal*"),
	"PSH": new MnemonicInfo([allOperands], "Base Instruction Set", "## Push to Stack"),
	"POP": new MnemonicInfo([registerOperands], "Base Instruction Set", "## Pop from Stack"),
	"CAL": new MnemonicInfo([memLocationOperands, allOperandsOptional], "Base Instruction Set", "## Call Subroutine"),
	"RET": new MnemonicInfo([allOperandsOptional], "Base Instruction Set", "## Return from Subroutine"),
	"WCN": new MnemonicInfo([allOperands], "Base Instruction Set", "## Write Number (64-bit) to Console"),
	"WCB": new MnemonicInfo([allOperands], "Base Instruction Set", "## Write Numeric Byte to Console"),
	"WCX": new MnemonicInfo([allOperands], "Base Instruction Set", "## Write Byte to Console as Hexadecimal"),
	"WCC": new MnemonicInfo([allOperands], "Base Instruction Set", "## Write Raw Byte to Console"),
	"WFN": new MnemonicInfo([allOperands], "Base Instruction Set", "## Write Number (64-bit) to File"),
	"WFB": new MnemonicInfo([allOperands], "Base Instruction Set", "## Write Numeric Byte to File"),
	"WFX": new MnemonicInfo([allOperands], "Base Instruction Set", "## Write Byte to File as Hexadecimal"),
	"WFC": new MnemonicInfo([allOperands], "Base Instruction Set", "## Write Raw Byte to File"),
	"OFL": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Open File"),
	"CFL": new MnemonicInfo([], "Base Instruction Set", "## Close File"),
	"DFL": new MnemonicInfo([memLocationOperands], "Base Instruction Set", "## Delete File"),
	"FEX": new MnemonicInfo([registerOperands, memLocationOperands], "Base Instruction Set", "## File Exists?"),
	"FSZ": new MnemonicInfo([registerOperands, memLocationOperands], "Base Instruction Set", "## Get File Size"),
	"RCC": new MnemonicInfo([registerOperands], "Base Instruction Set", "## Read Raw Byte from Console"),
	"RFC": new MnemonicInfo([registerOperands], "Base Instruction Set", "## Read Raw Byte from File"),

	// Signed instruction set
	"SIGN_JLT": new MnemonicInfo([memLocationOperands], "Signed Extension Set", "## Jump If Less Than"),
	"SIGN_JLE": new MnemonicInfo([memLocationOperands], "Signed Extension Set", "## Jump If Less Than or Equal To"),
	"SIGN_JGT": new MnemonicInfo([memLocationOperands], "Signed Extension Set", "## Jump If Greater Than"),
	"SIGN_JGE": new MnemonicInfo([memLocationOperands], "Signed Extension Set", "## Jump If Greater Than or Equal To"),
	"SIGN_JSI": new MnemonicInfo([memLocationOperands], "Signed Extension Set", "## Jump If Sign Flag Set"),
	"SIGN_JNS": new MnemonicInfo([memLocationOperands], "Signed Extension Set", "## Jump If Sign Flag Unset"),
	"SIGN_JOV": new MnemonicInfo([memLocationOperands], "Signed Extension Set", "## Jump If Overflow Flag Set"),
	"SIGN_JNO": new MnemonicInfo([memLocationOperands], "Signed Extension Set", "## Jump If Overflow Flag Unset"),
	"SIGN_DIV": new MnemonicInfo([registerOperands, allOperands], "Signed Extension Set", "## Divide (Ignore Remainder)"),
	"SIGN_DVR": new MnemonicInfo([registerOperands, registerOperands, allOperands], "Signed Extension Set", "## Divide (With Remainder)"),
	"SIGN_REM": new MnemonicInfo([registerOperands, allOperands], "Signed Extension Set", "## Remainder"),
	"SIGN_SHR": new MnemonicInfo([registerOperands, allOperands], "Signed Extension Set", "## Arithmetic Shift Right"),
	"SIGN_MVB": new MnemonicInfo([registerOperands, allOperands], "Signed Extension Set", "## Move Byte (8-bits) and Extend Sign to 64-bits\n\n*Note: If the destination operand is an address or pointer, the source must be a register or literal*"),
	"SIGN_MVW": new MnemonicInfo([registerOperands, allOperands], "Signed Extension Set", "## Move Word (16-bits, 2 bytes) and Extend Sign to 64-bits\n\n*Note: If the destination operand is an address or pointer, the source must be a register or literal*"),
	"SIGN_MVD": new MnemonicInfo([registerOperands, allOperands], "Signed Extension Set", "## Move Double Word (32-bits, 4 bytes) and Extend Sign to 64-bits\n\n*Note: If the destination operand is an address or pointer, the source must be a register or literal*"),
	"SIGN_WCN": new MnemonicInfo([allOperands], "Signed Extension Set", "## Write Number (64-bit) to Console"),
	"SIGN_WCB": new MnemonicInfo([allOperands], "Signed Extension Set", "## Write Numeric Byte to Console"),
	"SIGN_WFN": new MnemonicInfo([allOperands], "Signed Extension Set", "## Write Number (64-bit) to File"),
	"SIGN_WFB": new MnemonicInfo([allOperands], "Signed Extension Set", "## Write Numeric Byte to File"),
	"SIGN_EXB": new MnemonicInfo([registerOperands], "Signed Extension Set", "## Extend Signed Byte (8-bits) to Signed Quad Word (64-bits, 8 bytes)"),
	"SIGN_EXW": new MnemonicInfo([registerOperands], "Signed Extension Set", "## Extend Signed Word (16-bits, 2 bytes) to Signed Quad Word (64-bits, 8 bytes)"),
	"SIGN_EXD": new MnemonicInfo([registerOperands], "Signed Extension Set", "## Extend Signed Double Word (32-bits, 4 bytes) to Signed Quad Word (64-bits, 8 bytes)"),
	"SIGN_NEG": new MnemonicInfo([registerOperands], "Signed Extension Set", "## Two's Complement Negation"),

	// Floating point instruction set
	"FLPT_ADD": new MnemonicInfo([registerOperands, allOperands], "Floating Point Extension Set", "## Add"),
	"FLPT_SUB": new MnemonicInfo([registerOperands, allOperands], "Floating Point Extension Set", "## Subtract"),
	"FLPT_MUL": new MnemonicInfo([registerOperands, allOperands], "Floating Point Extension Set", "## Multiply"),
	"FLPT_DIV": new MnemonicInfo([registerOperands, allOperands], "Floating Point Extension Set", "## Divide (Ignore Remainder)"),
	"FLPT_DVR": new MnemonicInfo([registerOperands, registerOperands, allOperands], "Floating Point Extension Set", "## Divide (With Remainder)"),
	"FLPT_REM": new MnemonicInfo([registerOperands, allOperands], "Floating Point Extension Set", "## Remainder"),
	"FLPT_SIN": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Sine"),
	"FLPT_ASN": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Inverse Sine"),
	"FLPT_COS": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Cosine"),
	"FLPT_ACS": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Inverse Cosine"),
	"FLPT_TAN": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Tangent"),
	"FLPT_ATN": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Inverse Tangent"),
	"FLPT_PTN": new MnemonicInfo([registerOperands, allOperands], "Floating Point Extension Set", "## 2 Argument Inverse Tangent"),
	"FLPT_POW": new MnemonicInfo([registerOperands, allOperands], "Floating Point Extension Set", "## Exponentiation"),
	"FLPT_LOG": new MnemonicInfo([registerOperands, allOperands], "Floating Point Extension Set", "## Logarithm"),
	"FLPT_WCN": new MnemonicInfo([allOperands], "Floating Point Extension Set", "## Write Number (64-bit) to Console"),
	"FLPT_WFN": new MnemonicInfo([allOperands], "Floating Point Extension Set", "## Write Number (64-bit) to File"),
	"FLPT_EXH": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Extend Half Precision Float (16-bits, 2 bytes) to Double Precision Float (64-bits, 8 bytes)"),
	"FLPT_EXS": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Extend Single Precision Float (32-bits, 4 bytes) to Double Precision Float (64-bits, 8 bytes)"),
	"FLPT_SHS": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Shrink Double Precision Float (64-bits, 8 bytes) to Single Precision Float (32-bits, 4 bytes)"),
	"FLPT_SHH": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Shrink Double Precision Float (64-bits, 8 bytes) to Half Precision Float (16-bits, 2 bytes)"),
	"FLPT_NEG": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Negate"),
	"FLPT_UTF": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Convert Unsigned Quad Word (64-bits, 8 bytes) to Double Precision Float (64-bits, 8 bytes)"),
	"FLPT_STF": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Convert Signed Quad Word (64-bits, 8 bytes) to Double Precision Float (64-bits, 8 bytes)"),
	"FLPT_FTS": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Convert Double Precision Float (64-bits, 8 bytes) to Signed Quad Word (64-bits, 8 bytes) through Truncation"),
	"FLPT_FCS": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Convert Double Precision Float (64-bits, 8 bytes) to Signed Quad Word (64-bits, 8 bytes) through Ceiling Rounding"),
	"FLPT_FFS": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Convert Double Precision Float (64-bits, 8 bytes) to Signed Quad Word (64-bits, 8 bytes) through Floor Rounding"),
	"FLPT_FNS": new MnemonicInfo([registerOperands], "Floating Point Extension Set", "## Convert Double Precision Float (64-bits, 8 bytes) to Signed Quad Word (64-bits, 8 bytes) through Nearest Rounding"),
	"FLPT_CMP": new MnemonicInfo([registerOperands, allOperands], "Floating Point Extension Set", "## Compare (Discarded Subtraction)"),

	// Extended base set
	"EXTD_BSW": new MnemonicInfo([registerOperands], "Extended Base Set", "## Reverse Byte Order"),

	// External assembly extension set
	"ASMX_LDA": new MnemonicInfo([memLocationOperands], "External Assembly Extension Set", "## Load External Assembly"),
	"ASMX_LDF": new MnemonicInfo([memLocationOperands], "External Assembly Extension Set", "## Load External Function"),
	"ASMX_CLA": new MnemonicInfo([], "External Assembly Extension Set", "## Close External Assembly"),
	"ASMX_CLF": new MnemonicInfo([], "External Assembly Extension Set", "## Close External Function"),
	"ASMX_AEX": new MnemonicInfo([registerOperands, memLocationOperands], "External Assembly Extension Set", "## External Assembly Valid?"),
	"ASMX_FEX": new MnemonicInfo([registerOperands, memLocationOperands], "External Assembly Extension Set", "## External Function Valid?"),
	"ASMX_CAL": new MnemonicInfo([allOperandsOptional], "External Assembly Extension Set", "## Call External Function"),

	// Memory allocation extension set
	"HEAP_ALC": new MnemonicInfo([registerOperands, allOperands], "Memory Allocation Extension Set", "## Allocate Memory\n\n*Throw error upon failure*"),
	"HEAP_TRY": new MnemonicInfo([registerOperands, allOperands], "Memory Allocation Extension Set", "## Try Allocate Memory\n\n*Return error code upon failure*"),
	"HEAP_REA": new MnemonicInfo([registerOperands, allOperands], "Memory Allocation Extension Set", "## Re-allocate Memory\n\n*Throw error upon failure*"),
	"HEAP_TRE": new MnemonicInfo([registerOperands, allOperands], "Memory Allocation Extension Set", "## Try Re-allocate Memory\n\n*Return error code upon failure*"),
	"HEAP_FRE": new MnemonicInfo([registerOperands], "Memory Allocation Extension Set", "## Free Memory"),

	// Directives
	"%PAD": new MnemonicInfo([literalOperands], "Assembler Directives", "## Pad With 0s"),
	"%DAT": new MnemonicInfo([literalOrStringOperands], "Assembler Directives", "## Insert Raw Byte or String"),
	"%NUM": new MnemonicInfo([literalOperands], "Assembler Directives", "## Insert Raw Quad Word (64-bits, 8 bytes)"),
	"%IMP": new MnemonicInfo([stringOperands], "Assembler Directives", "## Import AssEmbly Source"),
	"%MACRO": new MnemonicInfo([specialOperands, specialOperandsOptional], "Assembler Directives", "## Define Macro\n\n*Give 2 operands to define a single-line macro, or 1 operand to define a multi-line macro.*\n\n*Note: Macro operands can be any arbitrary text, they do not have to be of a defined operand type*"),
	"%ENDMACRO": new MnemonicInfo([], "Assembler Directives", "## End Multi-line Macro Definition"),
	"%DELMACRO": new MnemonicInfo([specialOperands], "Assembler Directives", "## Remove Macro\n\n*Note: Macro operands can be any arbitrary text, they do not have to be of a defined operand type*"),
	"%ANALYZER": new MnemonicInfo([specialOperands, specialOperands, specialOperands], "Assembler Directives", "## Toggle Assembler Warning\n\nFirst operand is one of `error`, `warning`, or `suggestion`.\n\nSecond operand is the numerical code of the message\n\nThe third operand is one of `0`, `1`, or `r`."),
	"%MESSAGE": new MnemonicInfo([specialOperands, stringOperandsOptional], "Assembler Directives", "## Manually Emit Assembler Message\n\nFirst operand is one of `error`, `warning`, or `suggestion`."),
	"%IBF": new MnemonicInfo([stringOperands], "Assembler Directives", "## Import Binary File Contents"),
	"%DEBUG": new MnemonicInfo([], "Assembler Directives", "## Output Assembler State"),
	"%LABEL_OVERRIDE": new MnemonicInfo([literalOperands], "Assembler Directives", "## Manually Define Label Address"),
	"%STOP": new MnemonicInfo([stringOperandsOptional], "Assembler Directives", "## Stop Assembly"),
	"%REPEAT": new MnemonicInfo([literalOperands], "Assembler Directives", "## Repeat Block of Lines"),
	"%ENDREPEAT": new MnemonicInfo([], "Assembler Directives", "## End Repeat Block"),
	"%ASM_ONCE": new MnemonicInfo([], "Assembler Directives", "## Only Assemble File Once"),
	"%DEFINE": new MnemonicInfo([specialOperands, literalOperands], "Assembler Directives", "## Define Assembler Variable\n\nFirst operand is the name of the variable to define without the '@' prefix."),
	"%UNDEFINE": new MnemonicInfo([specialOperands], "Assembler Directives", "## Remove Assembler Variable\n\nFirst operand is the name of the variable to remove without the '@' prefix."),
	"%VAROP": new MnemonicInfo([specialOperands, specialOperands, literalOperands], "Assembler Directives", "## Assembler Variable Operation\n\nFirst operand is one of `ADD`, `SUB`, `MUL`, `DIV`, `REM`, `BIT_AND`, `BIT_OR`, `BIT_XOR`, `BIT_NOT`, `AND`, `OR`, `XOR`, `NOT`, `SHL`, `SHR`, `CMP_EQ`, `CMP_NEQ`, `CMP_GT`, `CMP_GTE`, `CMP_LT`, or `CMP_LTE`.\n\nSecond operand is the name of the variable to operate on without the '@' prefix."),
	"%IF": new MnemonicInfo([specialOperands, specialLiteralOperands, literalOperandsOptional], "Assembler Directives", "## Conditional Assembly If Block\n\nFirst operand is one of `DEF`, `NDEF`, `EQ`, `NEQ`, `GT`, `GTE`, `LT`, or `LTE`.\n\nSecond operand is the name of the variable to check without the '@' prefix for the `DEF` and `NDEF` operations, or a literal to compare with the third operand for the other operations.\n\nThird operand should not be given for the `DEF` and `NDEF` operations."),
	"%ELSE": new MnemonicInfo([], "Assembler Directives", "## Conditional Assembly Else Block"),
	"%ELSE_IF": new MnemonicInfo([specialOperands, specialLiteralOperands, literalOperandsOptional], "Assembler Directives", "## Conditional Assembly Else If Block\n\nFirst operand is one of `DEF`, `NDEF`, `EQ`, `NEQ`, `GT`, `GTE`, `LT`, or `LTE`.\n\nSecond operand is the name of the variable to check without the '@' prefix for the `DEF` and `NDEF` operations, or a literal to compare with the third operand for the other operations.\n\nThird operand should not be given for the `DEF` and `NDEF` operations."),
	"%ENDIF": new MnemonicInfo([], "Assembler Directives", "## End Conditional Assembly Block"),
	"%WHILE": new MnemonicInfo([specialOperands, specialLiteralOperands, literalOperandsOptional], "Assembler Directives", "## Conditionally Repeat Block of Lines\n\nFirst operand is one of `DEF`, `NDEF`, `EQ`, `NEQ`, `GT`, `GTE`, `LT`, or `LTE`.\n\nSecond operand is the name of the variable to check without the '@' prefix for the `DEF` and `NDEF` operations, or a literal to compare with the third operand for the other operations.\n\nThird operand should not be given for the `DEF` and `NDEF` operations."),
	"%ENDWHILE": new MnemonicInfo([], "Assembler Directives", "## End While Block"),
};

const registers: { [name: string]: string } = {
	"rpo": "Program Offset",
	"rso": "Stack Offset",
	"rsb": "Stack Base",
	"rsf": "Status Flags\n\n*(Zero Flag, Carry Flag, File End Flag, Sign Flag, Overflow Flag, 59 remaining high bits undefined)*",
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
};

const assemblerConstants: string[] = [
	"ASSEMBLER_VERSION_MAJOR",
	"ASSEMBLER_VERSION_MINOR",
	"ASSEMBLER_VERSION_PATCH",
	"V1_FORMAT",
	"V1_CALL_STACK",
	"IMPORT_DEPTH",
	"CURRENT_ADDRESS",
	"OBSOLETE_DIRECTIVES",
	"ESCAPE_SEQUENCES"
];

const predefinedMacros: string[] = [
	"FILE_PATH",
	"FILE_NAME",
	"FOLDER_PATH"
];

function generateMnemonicDescription(mnemonicName: string): vscode.MarkdownString {
	let docString = new vscode.MarkdownString();
	docString.appendMarkdown(mnemonics[mnemonicName].description);
	docString.appendMarkdown(`\n\n**This instruction is part of the \`${mnemonics[mnemonicName].extensionSet}\`**`);
	let operandCombinations = mnemonics[mnemonicName].operandCombinations;
	if (operandCombinations.length > 0) {
		docString.appendMarkdown("\n\n### Operand Requirements:\n\n");
		for (let i = 0; i < operandCombinations.length; i++) {
			docString.appendMarkdown("`");
			for (let j = 0; j < operandCombinations[i].length; j++) {
				if (operandCombinations[i][j] === OperandType.Optional) {
					docString.appendMarkdown(" (Optional)");
				}
				else {
					docString.appendMarkdown(OperandType[operandCombinations[i][j]]);
					if (j < operandCombinations[i].length - 1 && operandCombinations[i][j + 1] !== OperandType.Optional) {
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
		let line = document.lineAt(position.line).text;
		let beforeCursor = line.slice(0, position.character).toUpperCase().trim();
		// Don't autocorrect label definitions or comments
		if (beforeCursor[0] !== ':' && !beforeCursor.includes(';')) {
			// If this is the first word in the line
			if (!beforeCursor.includes(' ') && !beforeCursor.includes('(')) {
				if (beforeCursor[0] === '!') {
					// Remove macro disable prefix
					beforeCursor = beforeCursor.substring(1).trimStart();
				}
				for (let m in mnemonics) {
					if (m.indexOf(beforeCursor) !== -1) {
						let item = new vscode.CompletionItem(
							m, m[0] === '%'
							? vscode.CompletionItemKind.Keyword
							: vscode.CompletionItemKind.Function,
						);
						item.range = new vscode.Range(position.line, line.toUpperCase().indexOf(beforeCursor), position.line, position.character);
						completionItems.push(item);
					}
				}
			}
			else {
				let activeParameter = beforeCursor
					.split(' ').slice(-1)[0]
					.split(',').slice(-1)[0]
					.split('(').slice(-1)[0]
					.split(')')[0];
				// If not a label/address or numeral
				if (activeParameter[0] !== ':' && activeParameter[0] !== '-' && activeParameter[0] !== '.'
						&& (activeParameter[0] < '0' || activeParameter[0] > '9')) {
					// Assembler constants
					if (activeParameter.startsWith("@!")) {
						// Remove "@!" prefix
						activeParameter = activeParameter.slice(2);
						for (let i = 0; i < assemblerConstants.length; i++) {
							let c = assemblerConstants[i];
							if (c.toUpperCase().startsWith(activeParameter)) {
								completionItems.push(new vscode.CompletionItem(
									c, vscode.CompletionItemKind.Constant
								));
							}
						}
					}
					// Predefined macros
					else if (activeParameter.startsWith('#')) {
						// Remove "#" prefix
						activeParameter = activeParameter.slice(1);
						for (let i = 0; i < predefinedMacros.length; i++) {
							let c = predefinedMacros[i];
							if (c.toUpperCase().startsWith(activeParameter)) {
								completionItems.push(new vscode.CompletionItem(
									c, vscode.CompletionItemKind.Constant
								));
							}
						}
					}
					// Registers
					else {
						// Ignore pointer symbol
						if (activeParameter[0] === '*') {
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
		}
		return completionItems;
	}

	public resolveCompletionItem(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
		// Provides documentation on the selected operand in the code completion window
		// Mnemonics
		if (item.kind === vscode.CompletionItemKind.Keyword || item.kind === vscode.CompletionItemKind.Function) {
			item.documentation = generateMnemonicDescription(item.label.toString());
		}
		// Registers
		else if (item.kind === vscode.CompletionItemKind.Variable) {
			item.documentation = generateRegisterDescription(item.label.toString());
		}
		return item;
	}
}

class AssEmblyHoverProvider implements vscode.HoverProvider {
	public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
		let rawLine = document.lineAt(position.line).text;
		let line = rawLine.trimStart();
		if (line[0] === '!') {
			// Remove macro disable prefix
			line = line.substring(1).trimStart();
		}
		let indentOffset = rawLine.length - line.length;
		let charPosition = position.character - indentOffset;
		line = line.trimEnd();
		// If cursor is in the middle of a parameter consider the whole parameter
		let commaIndex = line.indexOf(',', charPosition);
		let spaceIndex = line.indexOf(' ', charPosition);
		let endIndex;
		if (commaIndex !== -1 && spaceIndex !== -1) {
			endIndex = Math.min(commaIndex, spaceIndex);
		}
		else if (commaIndex !== -1) {
			endIndex = commaIndex;
		}
		else if (spaceIndex !== -1) {
			endIndex = spaceIndex;
		}
		else {
			endIndex = line.length;
		}
		let beforeCursorOriginalCase = line.slice(0, endIndex)
			.split('(').slice(-1)[0]
			.split(')')[0];
		let beforeCursor = beforeCursorOriginalCase.toUpperCase();
		// Don't provide hover for comments, strings, or empty lines
		if (beforeCursor.includes(';') || beforeCursor.includes('"') || beforeCursor.trimStart().length === 0) {
			return null;
		}
		// Mnemonic
		if (!beforeCursor.includes(' ') && mnemonics[beforeCursor] !== undefined) {
			return new vscode.Hover(generateMnemonicDescription(beforeCursor));
		}
		let activeParameterOriginalCase = beforeCursorOriginalCase.split(' ').slice(-1)[0].split(',').slice(-1)[0];
		let activeParameter = activeParameterOriginalCase.toUpperCase();
		let registerOpFormat = activeParameter.replace(/^\*/, '').toLowerCase();
		// Register
		if (registers[registerOpFormat] !== undefined) {
			let hoverString = generateRegisterDescription(registerOpFormat);
			if (activeParameter[0] === '*') {
				hoverString.appendMarkdown("\n\n*`\*`: Register contents will be treated as a pointer to address in memory*");
			}
			return new vscode.Hover(hoverString);
		}
		// Label reference/address
		if (beforeCursor.includes(' ') && activeParameter[0] === ":") {
			if (activeParameter.length >= 2 && activeParameter[1] >= '0' && activeParameter[1] <= '9') {
				return new vscode.Hover("## Address Literal");
			}
			let hoverString = new vscode.MarkdownString("## Label Reference");
			if (activeParameter.length > 1 && activeParameter[1] === '&') {
				hoverString.appendMarkdown("\n\n*`&`: Address corresponding to label will be treated as a literal numeric value*");
			}
			return new vscode.Hover(hoverString);
		}
		// Label definition
		if (activeParameter[0] === ":") {
			return new vscode.Hover("## Label Definition");
		}
		// Character literal
		if (activeParameter.length >= 3 && activeParameter[0] === '\''
				&& activeParameter[activeParameter.length - 1] === '\'') {
			let characterLiteral = activeParameterOriginalCase.slice(1, -1);
			let numericalUtf8 : BigInt;
			let utf8Bytes : Uint8Array;
			if (characterLiteral[0] === '\\' && characterLiteral.length >= 2) {
				let escape = characterLiteral[1];
				switch (escape) {
					// Escapes that keep the same character
					case '\'':
					case '"':
					case '\\':
						break;
					// Escapes that map to another character
					case '0':
						escape = '\0';
						break;
					case 'a':
						escape = '\a';
						break;
					case 'b':
						escape = '\b';
						break;
					case 'f':
						escape = '\f';
						break;
					case 'n':
						escape = '\n';
						break;
					case 'r':
						escape = '\r';
						break;
					case 't':
						escape = '\t';
						break;
					case 'v':
						escape = '\v';
						break;
					case 'u': {
						if (characterLiteral.length < 6) {
							return null;
						}
						let rawCodePoint = characterLiteral.slice(2);
						escape = String.fromCharCode(parseInt(rawCodePoint, 16));
						break;
					}
					case 'U': {
						if (characterLiteral.length < 10) {
							return null;
						}
						let rawCodePoint = characterLiteral.slice(2);
						escape = String.fromCodePoint(parseInt(rawCodePoint, 16));
						break;
					}
					default:
						return null;
				}
				utf8Bytes = new TextEncoder().encode(escape);
			}
			else {
				utf8Bytes = new TextEncoder().encode(characterLiteral);
			}
			let num = 0n;
			for (let i = 0; i < utf8Bytes.length; i++) {
				num += BigInt(utf8Bytes[i]) << BigInt(i * 8);
			}
			numericalUtf8 = BigInt.asUintN(64, num);
			return new vscode.Hover(
				new vscode.MarkdownString(`## Character Literal\n\n**Numeric value:** \`${numericalUtf8}\``));
		}
		// Numeric literal
		if ((activeParameter[0] >= '0' && activeParameter[0] <= '9')
				|| activeParameter[0] === '.' || activeParameter[0] === '-') {
			let hoverString = new vscode.MarkdownString("## Numeric Literal");
			if (activeParameter.startsWith("0X")) {
				hoverString.appendMarkdown("\n\n*`0x`: Hexadecimal number*");
			}
			else if (activeParameter.startsWith("0B")) {
				hoverString.appendMarkdown("\n\n*`0b`: Binary number*");
			}
			else if (activeParameter.includes(".") && activeParameter.startsWith("-")) {
				hoverString.appendMarkdown("\n\n*`-` and `.`: Negative floating point number*");
			}
			else if (activeParameter.startsWith("-")) {
				hoverString.appendMarkdown("\n\n*`-`: Signed negative number*");
			}
			else if (activeParameter.includes(".")) {
				hoverString.appendMarkdown("\n\n*`.`: Floating point number*");
			}
			return new vscode.Hover(hoverString);
		}
		// Assembler variable/constant
		if (activeParameter[0] === '@') {
			if (activeParameter.length >= 2 && activeParameter[1] === '!') {
				return new vscode.Hover("## Assembler Constant");
			}
			return new vscode.Hover("## Assembler Variable");
		}
		if (activeParameter[0] === '#') {
			let macro = activeParameter.slice(1);
			for (let i = 0; i < predefinedMacros.length; i++) {
				if (macro.startsWith(predefinedMacros[i])) {
					return new vscode.Hover("## Pre-defined Macro");
				}
			}
		}
		return null;
	}
}

function updateDiagnostics(collection: vscode.DiagnosticCollection) {
	collection.clear();
	let document = vscode.window.activeTextEditor?.document;
	if (document !== undefined && document.languageId === "assembly-tolly") {
		let result: any;
		let warnings: any;
		let assembledLines: any;

		let configuration = vscode.workspace.getConfiguration();
		let linterPath: string | null | undefined = configuration.get('assembly-tolly.linting.linterPath');
		let filePathOverride: string | null | undefined = configuration.get('assembly-tolly.linting.baseFileOverride');
		let macroLimit: number | null | undefined = configuration.get('assembly-tolly.linting.macroLimit');
		let whileRepeatLimit: number | null | undefined = configuration.get('assembly-tolly.linting.whileRepeatLimit');

		let filePath: string = filePathOverride || document.uri.fsPath;

		let variables: any = configuration.get('assembly-tolly.linting.variableDefines');
		let variableString = "";

		for (let v in variables) {
			variableString += `${v}:${variables[v]},`;
		}
		// Remove trailing comma
		variableString = variableString.replace(/,$/g, "");
		let commandLine = `${linterPath} lint "${filePath.replace(/"/g, '\\"')}" --no-header --macro-limit=${macroLimit} --while-limit=${whileRepeatLimit} --define=${variableString}`;
		if (configuration.get("assembly-tolly.linting.enableObsoleteDirectives")) {
			commandLine += " --allow-old-directives";
		}
		if (configuration.get("assembly-tolly.linting.disableVariableExpansion")) {
			commandLine += " --disable-variables";
		}
		if (configuration.get("assembly-tolly.linting.disableEscapeSequences")) {
			commandLine += " --disable-escapes";
		}
		if (configuration.get("assembly-tolly.linting.disableFileMacros")) {
			commandLine += " --disable-file-macros";
		}
		child_process.exec(
			commandLine,
			async (err, stdout, _) => {
				if (document === undefined) {
					return;
				}
				try {
					console.log(`AssEmbly linter: attempting to decode "${stdout.trim()}"`);
					result = JSON.parse(stdout);
					warnings = result["Warnings"];
					assembledLines = result["AssembledLines"];
				}
				catch {
					warnings = null;
					assembledLines = null;
				}
				if (result !== undefined && "error" in result) {
					console.error('Error from AssEmbly while linting: ' + result["error"]);
					return;
				}
				if (err) {
					console.error(
						'Unexpected error launching AssEmbly executable: ' + err
						+ ' The following may provide some info: ' + stdout);
					return;
				}
				if (warnings === undefined && Array.isArray(result)) {
					// If a fatal error occurs, AssEmbly will just give us a single element list instead of a full assembly result
					warnings = result;
				}
				if (result === null || warnings === null) {
					console.error("An unknown error occurred during AssEmbly linting");
					return;
				}

				let newDiagnostics: any = {};

				for (let i = 0; i < warnings.length; i++) {
					let warning = warnings[i];
					let path_str = warning["Position"]["File"];
					let path: vscode.Uri = vscode.Uri.file(path_str === "" ? filePath : path_str);
					let lineIndex = warning["Position"]["Line"] - 1;
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
					if (warning["MacroName"] !== "") {
						messageStart += ` (in macro "${warning["MacroName"]}")`;
					}
					if (!(path.fsPath in newDiagnostics)) {
						newDiagnostics[path.fsPath] = [];
					}
					let doc = await vscode.workspace.openTextDocument(path);
					let lineLength = doc.lineAt(lineIndex).text.length;
					newDiagnostics[path.fsPath].push(new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, lineLength),
						`${messageStart}: ${warning["Message"]}`, diagnosticSeverity));
				}

				if (Array.isArray(assembledLines)) {
					if (!(document.uri.fsPath in newDiagnostics)) {
						newDiagnostics[document.uri.fsPath] = [];
					}
					let assembledLineSet = new Set();
					assembledLines
						.filter((l: any) => l["File"] === "")
						.forEach((l: any) => assembledLineSet.add(l["Line"] - 1));
					for (let i = 0; i < document.lineCount; i++) {
						if (!assembledLineSet.has(i)) {
							let lineLength = document.lineAt(i).text.length;
							let diag = new vscode.Diagnostic(
								new vscode.Range(i, 0, i, lineLength),
								"Line is not assembled", vscode.DiagnosticSeverity.Hint);
							diag.tags = [vscode.DiagnosticTag.Unnecessary];
							newDiagnostics[document.uri.fsPath].push(diag);
						}
					}
				}

				for (let path in newDiagnostics) {
					collection.set(vscode.Uri.file(path), newDiagnostics[path]);
				}
			}
		);
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
	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(_ => {
		updateDiagnostics(diagnosticCollection);
	}));
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(_ => {
		updateDiagnostics(diagnosticCollection);
	}));
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(_ => {
		diagnosticCollection.clear();
	}));
	updateDiagnostics(diagnosticCollection);
}

export function deactivate() { }
