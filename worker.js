// worker.js

// Mocking the LSP lifecycle
self.onmessage = (e) => {
    const { jsonrpc, method, params, id } = e.data;

    switch (method) {
        case 'initialize':
            self.postMessage({
                jsonrpc: "2.0",
                id,
                result: {
                    capabilities: {
                        hoverProvider: true,
                        diagnosticProvider: true
                    }
                }
            });
            break;

        case 'textDocument/didChange':
            const text = params.contentChanges[0].text;
            const diagnostics = validate(text);
            self.postMessage({
                jsonrpc: "2.0",
                method: 'textDocument/publishDiagnostics',
                params: {
                    uri: params.textDocument.uri,
                    diagnostics
                }
            });
            break;
    }
};

function validate(text) {
    const diagnostics = [];
    
    // 1. Check for illegal characters
    const illegalChars = /[^\d\s\+\-\*\/$$$$\.]/g;
    let match;
    while ((match = illegalChars.exec(text)) !== null) {
        diagnostics.push({
            range: getRange(text, match.index, match.index + 1),
            severity: 1, // Error
            message: `Unexpected character: ${match[0]}`
        });
    }

    // 2. Simple Bracket Matcher
    const stack = [];
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '(') stack.push(i);
        else if (text[i] === ')') {
            if (stack.length === 0) {
                diagnostics.push({
                    range: getRange(text, i, i + 1),
                    severity: 1,
                    message: "Unmatched closing bracket"
                });
            } else {
                stack.pop();
            }
        }
    }
    stack.forEach(pos => {
        diagnostics.push({
            range: getRange(text, pos, pos + 1),
            severity: 1,
            message: "Unclosed bracket"
        });
    });

    return diagnostics;
}

// Converts index to LSP Line/Character format
function getRange(text, startIdx, endIdx) {
    const lines = text.substring(0, startIdx).split('\n');
    const startLine = lines.length - 1;
    const startChar = lines[lines.length - 1].length;
    
    return {
        start: { line: startLine, character: startChar },
        end: { line: startLine, character: startChar + (endIdx - startIdx) }
    };
}
