function getWebviewContent(state) {
    const inputText = state ? state.input : '';
    const outputText = state ? state.output : '';

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Webview</title>
            <link rel="icon" href="https://vscode-icons.githubusercontent.com/public/images/favicon.ico" type="image/x-icon">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
            <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
            <style>
                :root {
                    color-scheme: light dark;
                    --vscode-background: var(--vscode-editor-background);
                    --vscode-foreground: var(--vscode-editor-foreground);
                    --vscode-button-background: var(--vscode-button-background);
                    --vscode-button-foreground: var(--vscode-button-foreground);
                    --vscode-button-hover-background: var(--vscode-button-hoverBackground);
                }
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    display: flex;
                    flex-direction: row;
                    height: 100vh;
                    background-color: var(--vscode-background);
                    color: var(--vscode-foreground);
                }
                .section {
                    flex: 1;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }
                .vscode-heading {
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                    margin-bottom: 10px;
                    padding: 5px 10px;
                    border-bottom: 2px solid var(--vscode-editorWidget-border);
                    background-color: var(--vscode-editor-background);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .divider {
                    width: 1px;
                    background-color: var(--vscode-editorWidget-border);
                    margin: 0 25px;
                }
                .section textarea {
                    border: 1px solid #ddd;
                    padding: 10px;
                    flex: 1;
                    min-height: 400px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    background-color: transparent;
                    color: var(--vscode-foreground);
                }
                .button-group {
                    display: flex;
                    gap: 10px;
                }
                #submitButton {
                    flex: 3;
                }
                #uploadButton {
                    flex: 1;
                }
                #copyButton, #downloadButton {
                    flex: 1;
                }
                #outputBox {
                    border: 1px solid #ddd;
                    padding: 10px;
                    flex: 1;
                    min-height: 400px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-foreground);
                }
                pre {
                    position: relative;
                    margin-top: 1rem;
                    border-radius: 4px;
                    padding: 10px;
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-editorWidget-border);
                    overflow-x: auto;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    color: var(--vscode-foreground);
                }
                .copy-code-btn {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 5px 10px;
                    cursor: pointer;
                    font-size: 12px;
                    border-radius: 3px;
                }
                .copy-code-btn:hover {
                    background-color: var(--vscode-button-hover-background);
                }
                #notification, #jsonNotification, #txtNotification, #inputNotification {
                    display: none;
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #333;
                    color: #fff;
                    padding: 10px;
                    border-radius: 5px;
                    font-size: 14px;
                }
                #loader {
                    display: none;
                    border: 4px solid #f3f3f3; 
                    border-top: 4px solid #3498db; 
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 2s linear infinite;
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @media (max-width: 800px) {
                    body {
                        flex-direction: column;
                    }
                }
            </style>
        </head>
        <body>
            <div id="notification" class="alert alert-success">Copied to clipboard!</div>
            <div id="jsonNotification" class="alert alert-success">No JSON Testcases yet!</div>
            <div id="txtNotification" class="alert alert-success">No text content to download!</div>
            <div id="inputNotification" class="alert alert-success">Please enter API code first!</div>

            <div class="section">
                <div class="vscode-heading">Your API Code Here</div>
                <textarea id="inputBox" placeholder="Enter text..." required>${inputText}</textarea>
                <div class="button-group">
                    <button id="uploadButton" class="btn btn-secondary mt-2">
                        <i class="fas fa-upload"></i> Upload From File
                    </button>
                    <button id="submitButton" class="btn btn-primary mt-2">Generate Testcases</button>
                </div>
                <input type="file" id="fileInput" style="display:none;" />
            </div>

            <div class="divider"></div> <!-- Vertical line -->

            <div class="section">
                <div id="outputBox" class="border rounded p-3"></div>
                <div class="button-group">
                    <button id="copyButton" class="btn btn-secondary mt-2">
                        <i class="fas fa-copy"></i> Copy to clipboard
                    </button>
                    <button id="downloadButton" class="btn btn-secondary mt-2">
                        <i class="fas fa-file-download"></i> Download JSON
                    </button>
                    <button id="downloadTxtButton" class="btn btn-secondary mt-2">
                        <i class="fas fa-file-alt"></i> Download TXT
                    </button>
                </div>
            </div>
            <div id="loader"></div>
            <script>
                const vscode = acquireVsCodeApi();

                const outputText = ${JSON.stringify(outputText)};
                const outputBox = document.getElementById('outputBox');
                outputBox.innerHTML = marked.parse(outputText);
                addCopyButtons();

                document.getElementById('submitButton').addEventListener('click', () => {
                    const inputText = document.getElementById('inputBox').value;
                    if (!inputText.trim()) {
                        const inputNotification = document.getElementById('inputNotification');
                        inputNotification.style.display = 'block';
                        setTimeout(() => {
                            inputNotification.style.display = 'none';
                        }, 2000);
                        return;
                    }
                    document.getElementById('loader').style.display = 'block';
                    vscode.postMessage({ command: 'submit', text: inputText });
                });

                document.getElementById('copyButton').addEventListener('click', () => {
                    const outputBox = document.getElementById('outputBox');
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(outputBox);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    document.execCommand('copy');
                    selection.removeAllRanges();

                    const notification = document.getElementById('notification');
                    notification.style.display = 'block';
                    setTimeout(() => {
                        notification.style.display = 'none';
                    }, 2000);
                });

                document.getElementById('downloadButton').addEventListener('click', () => {
                    const jsonTestCases = collectJSONTestCases();
                    if (jsonTestCases.length > 0) {
                        const jsonString = JSON.stringify(jsonTestCases, null, 2);
                        // Send a message to the extension
                        vscode.postMessage({
                            command: 'download',
                            text: jsonString
                        });
                    } else {
                        const jsonNotification = document.getElementById('jsonNotification');
                        jsonNotification.style.display = 'block';
                        setTimeout(() => {
                            jsonNotification.style.display = 'none';
                        }, 2000);
                    }
                });

                document.getElementById('downloadTxtButton').addEventListener('click', () => {
                    // Clone the outputBox element
                    const outputBoxClone = outputBox.cloneNode(true);

                    // Remove all "Copy" buttons from the cloned element
                    const copyButtons = outputBoxClone.querySelectorAll('.copy-code-btn');
                    copyButtons.forEach(button => button.remove());

                    // Get the innerText from the cloned element
                    const textContent = outputBoxClone.innerText.trim();

                    if (textContent) {
                        // Send the text content to the extension for download
                        vscode.postMessage({
                            command: 'downloadTxt',
                            text: textContent
                        });
                    } else {
                        const txtNotification = document.getElementById('txtNotification');
                        txtNotification.style.display = 'block';
                        setTimeout(() => {
                            txtNotification.style.display = 'none';
                        }, 2000);
                    }
                });

                document.getElementById('uploadButton').addEventListener('click', () => {
                    document.getElementById('fileInput').click();
                });

                document.getElementById('fileInput').addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const content = e.target.result;
                            document.getElementById('inputBox').value = content;
                        };
                        reader.onerror = (e) => {
                            vscode.window.showErrorMessage('Failed to read file: ' + e.target.error);
                        };
                        reader.readAsText(file);
                    }
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'display':
                            const outputBox = document.getElementById('outputBox');
                            outputBox.innerHTML = marked.parse(message.text);
                            document.getElementById('loader').style.display = 'none';
                            addCopyButtons();  // Add copy buttons after new content is displayed
                            break;
                    }
                });

                function addCopyButtons() {
                    const codeBlocks = document.querySelectorAll('pre code');
                    codeBlocks.forEach((block) => {
                        const pre = block.parentElement;
                        const copyBtn = document.createElement('button');
                        copyBtn.textContent = 'Copy';
                        copyBtn.classList.add('copy-code-btn');
                        pre.appendChild(copyBtn);

                        copyBtn.addEventListener('click', () => {
                            const range = document.createRange();
                            range.selectNodeContents(block);
                            const selection = window.getSelection();
                            selection.removeAllRanges();
                            selection.addRange(range);
                            document.execCommand('copy');
                            selection.removeAllRanges();

                            const notification = document.getElementById('notification');
                            notification.style.display = 'block';
                            setTimeout(() => {
                                notification.style.display = 'none';
                            }, 2000);
                        });
                    });
                }

                function collectJSONTestCases() {
                    const jsonTestCases = [];
                    const codeBlocks = document.querySelectorAll('pre code');
                    codeBlocks.forEach((block) => {
                        try {
                            const json = JSON.parse(block.textContent);
                            jsonTestCases.push(json);
                        } catch (e) {
                            // Not a JSON block, ignore
                        }
                    });
                    console.log(jsonTestCases);
                    return jsonTestCases;
                }
            </script>
        </body>
        </html>
    `;
}

module.exports = getWebviewContent;
