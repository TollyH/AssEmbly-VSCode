# AssEmbly Visual Studio Code Extension [![NodeJS with VSCE](https://github.com/TollyH/AssEmbly-VSCode/actions/workflows/node.yml/badge.svg)](https://github.com/TollyH/AssEmbly-VSCode/actions/workflows/node.yml)

A Visual Studio code extension for [AssEmbly](https://github.com/TollyH/AssEmbly) providing the following features:

- Autocompletion of mnemonic, register, and assembler constant names
- Code linting - underlining errors, warnings, and suggestions returned as a result of assembling a program
- Syntax highlighting
- Mouse-over hover tooltips that describe what is being hovered over
- Highlighting of code that is not assembled, such as from an unsatisfied `%IF` directive

## Support for different language elements

- `✔️` - Currently supported
- `❌` - Currently not supported - but could be in the future
- `-` - Currently not supported, and is not applicable to be supported

| Element                              | Syntax highlighting | Hover description | Autocompletion|
|--------------------------------------|---------------------|-------------------|---------------|
| **Mnemonics**                        |                     |                   |               |
|   Directives                         | ✔️                  | ✔️                | ✔️            |
|   Instructions                       | ✔️                  | ✔️                | ✔️            |
| **Registers**                        |                     |                   |               |
|   Regular                            | ✔️                  | ✔️                | ✔️            |
|   Pointers                           | ✔️                  | ✔️                | ✔️            |
| **Labels**                           |                     |                   |               |
|   Definitions                        | ✔️                  | ✔️                | -             |
|   References                         | ✔️                  | ✔️                | ❌            |
|   Literal references                 | ✔️                  | ✔️                | ❌            |
| **Literals**                         |                     |                   |               |
|   Numeric                            | ✔️                  | ✔️                | -             |
|   Address                            | ✔️                  | ✔️                | -             |
|   Character                          | ✔️                  | ✔️                | -             |
|   String                             | ✔️                  | ❌                | -             |
|   Escape sequences                   | ✔️                  | ❌                | ❌            |
|   Import paths                       | -                   | ❌                | ❌            |
| **Assembler Variables**              |                     |                   |               |
|   Variables                          | ✔️                  | ✔️                | ❌            |
|   Constants                          | ✔️                  | ✔️                | ✔️            |
|   `%VAROP`/`%IF`/`%WHILE` operations | ❌                  | ❌                | ❌            |
| **Macros**                           |                     |                   |               |
|   Single-line macro use              | ❌                  | ❌                | ❌            |
|   Multi-line macro use               | ❌                  | ❌                | ❌            |
|   Parameter references               | ❌                  | ❌                | -             |
|   Predefined macro use               | ✔️                  | ✔️                | ✔️            |
| **Other**                            |                     |                   |               |
|   Comments                           | ✔️                  | ❌                | -             |

---

**Copyright © 2022–2024  Ptolemy Hill**

**Licensed under GPLv3. The full license text can be found in the LICENSE file, or at <https://www.gnu.org/licenses/gpl-3.0.html>**
