"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
var OperandType;
(function (OperandType) {
    OperandType[OperandType["Register"] = 0] = "Register";
    OperandType[OperandType["Literal"] = 1] = "Literal";
    OperandType[OperandType["Label"] = 2] = "Label";
    OperandType[OperandType["Pointer"] = 3] = "Pointer";
    OperandType[OperandType["Optional"] = 4] = "Optional";
})(OperandType || (OperandType = {}));
const allOperands = [OperandType.Register, OperandType.Literal, OperandType.Label, OperandType.Pointer];
const allOperandsOptional = [OperandType.Register, OperandType.Literal, OperandType.Label, OperandType.Pointer, OperandType.Optional];
const memLocationOperands = [OperandType.Label, OperandType.Pointer];
const writableOperands = [OperandType.Register, OperandType.Label, OperandType.Literal];
const registerOperands = [OperandType.Register];
const literalOperands = [OperandType.Literal];
class MnemonicInfo {
    constructor(operandCombinations, description) {
        this.operandCombinations = operandCombinations;
        this.description = description;
    }
}
const mnemonics = {
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
    "CFL": new MnemonicInfo([], "Close File"),
    "DFL": new MnemonicInfo([memLocationOperands], "## Delete File"),
    "RCC": new MnemonicInfo([registerOperands], "## Read Character from Console"),
    "RFC": new MnemonicInfo([registerOperands], "## Read Character from File"),
    "PAD": new MnemonicInfo([literalOperands], "## Pad With 0s"),
    "DAT": new MnemonicInfo([literalOperands], "## Insert Raw Data")
};
const registers = {
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
};
class AssEmblyCompletionItemProvider {
    provideCompletionItems(document, position, token, context) {
        let completionItems = [];
        let beforeCursor = document.lineAt(position.line).text.slice(0, position.character).toUpperCase();
        // Don't autocorrect label definitions or comments
        if (beforeCursor[0] != ':' && !beforeCursor.includes(';')) {
            // If this is the first word in the line
            if (!beforeCursor.includes(' ')) {
                for (let m in mnemonics) {
                    if (m.startsWith(beforeCursor)) {
                        completionItems.push(new vscode.CompletionItem(m, m == "PAD" || m == "DAT"
                            ? vscode.CompletionItemKind.Keyword
                            : vscode.CompletionItemKind.Function));
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
                            completionItems.push(new vscode.CompletionItem(r, vscode.CompletionItemKind.Variable));
                        }
                    }
                }
            }
        }
        return completionItems;
    }
    resolveCompletionItem(item, token) {
        // Provides documentation on the selected operand in the code completion window
        let docString = new vscode.MarkdownString();
        // Mnemonics
        if (item.kind == vscode.CompletionItemKind.Keyword || item.kind == vscode.CompletionItemKind.Function) {
            docString.appendMarkdown(mnemonics[item.label.toString()].description);
            let operandCombinations = mnemonics[item.label.toString()].operandCombinations;
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
        }
        // Registers
        else if (item.kind == vscode.CompletionItemKind.Variable) {
            docString.appendMarkdown(registers[item.label.toString()]);
        }
        item.documentation = docString;
        return item;
    }
}
function activate(context) {
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: 'assembly-tolly' }, new AssEmblyCompletionItemProvider()));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map