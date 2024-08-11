const TreeItem = require('./TreeItem');
const getWebviewContent = require('./webviewContent');
const {generateRandomId} = require('./utils');
const runGeminiApi = require('./gemini');

const vscode = require('vscode');

const fs = require('fs');
const path = require('path');

// since we are taking global variables, so avoid having different files for openWebview and TreeDataProvider
let webviews = {};
let treeDataProviderInstance;

function activate(context) {

    console.log('Extension testcase-factory active!');

    treeDataProviderInstance = new TreeDataProvider(context);
    const treeView = vscode.window.createTreeView('sidebarView', {
        treeDataProvider: treeDataProviderInstance
    });

    context.subscriptions.push(

        // Open webview which already exists
        vscode.commands.registerCommand('testcase-factory.openExistingPanel', (id) => {
            openWebview(context, id, webviews[id].name, treeDataProviderInstance);
        }),

        // Open a new webview and prompt for a name
        vscode.commands.registerCommand('testcase-factory.openNamedPanel', async () => {
            const name = await vscode.window.showInputBox({ prompt: 'Enter a name for the panel' });
            if (name) {
                const id = generateRandomId();
                openWebview(context, id, name, treeDataProviderInstance);
            }
        }),

        // Delete a webview
        vscode.commands.registerCommand('testcase-factory.deletePanel', async (id) => {

            const webviewId = id.id; // Adjust based on your id object structure
        
            const confirmation = await vscode.window.showWarningMessage(
                'Are you sure you want to delete this panel?',
                { modal: true },
                'Yes'
            );
        
            if (confirmation === 'Yes') {

                // Dispose of the panel if it is open
                if (webviews[webviewId]) {
                    const panel = webviews[webviewId].webviewPanel;
                    if (panel) {
                        panel.dispose();
                    }
                    // Delete from webviews object
                    delete webviews[webviewId];
                }
        
                // Remove from global state
                await context.globalState.update(`webviewState-${webviewId}`, undefined);
        
                // Refresh the tree view to reflect the changes
                treeDataProviderInstance.refresh();
        
                // Show success message
                vscode.window.showInformationMessage(`Panel deleted successfully.`);
            }
        }),       

        // Delete all webviews
        vscode.commands.registerCommand('testcase-factory.clearAllGlobalState', async () => {

            const confirmation = await vscode.window.showWarningMessage(
                'Are you sure you want to clear ALL saved data? This action cannot be undone.',
                { modal: true },
                'Yes'
            );
        
            if (confirmation === 'Yes') {
                // Clear all global state data
                const keys = context.globalState.keys();
                keys.forEach(key => context.globalState.update(key, undefined));
                webviews = {}; // Clear in-memory webviews
                treeDataProviderInstance.refresh();
                vscode.window.showInformationMessage('All saved data has been cleared.');
            }
        }),         
        
        // Rename a webview
        vscode.commands.registerCommand('testcase-factory.renamePanel', async (id) => {

            const webviewId = id.id;
        
            const newName = await vscode.window.showInputBox({ prompt: 'Enter a new name for the panel' });
            if (newName) {
                const sanitizedNewName = newName.trim();
                
                // Ensure the webview exists before renaming
                if (webviews[webviewId]) {
                    const oldState = context.globalState.get(`webviewState-${webviewId}`);
                    if (oldState) {
                        const newState = { 
                            ...oldState, 
                            name: sanitizedNewName 
                        };
                        // Update global state
                        context.globalState.update(`webviewState-${webviewId}`, newState);
                    }

                    webviews[webviewId].name = sanitizedNewName;

                    // Update the webview panel's title
                    const panel = webviews[webviewId].webviewPanel;
                    if (panel) {
                        panel.title = sanitizedNewName;
                    }
    
                    // Refresh the tree view
                    treeDataProviderInstance.refresh();
                    
                    // Show success message
                    vscode.window.showInformationMessage(`Panel renamed to ${sanitizedNewName}`);
                }
            }
        }),        

        // Register the treeView
        treeView
    );
}

class TreeDataProvider {

    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        // Load saved webviews from global state
        this.loadSavedWebviews();
    }

    getTreeItem(element) {
        // This value will be used to identify the item in the context menu
        if (element.label === 'CREATE NEW PANEL') {
            element.contextValue = 'newPanelItem';
        } else {
            element.contextValue = 'webviewItem';
        }
        return element;
    }

    getChildren(element) {
        // Load saved webviews from global state
        this.loadSavedWebviews();

        // Create numbered webview items
        const webviewItems = Object.keys(webviews).map((id, index) => {
            const itemNumber = index + 1; // Start numbering from 1
            return new TreeItem(`${itemNumber}. ${webviews[id].name || `Webview ${id}`}`, id);
        });

        return Promise.resolve([new TreeItem('CREATE NEW PANEL'), ...webviewItems]);
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    loadSavedWebviews() {
        const savedWebviews = this.context.globalState.keys().filter(key => key.startsWith('webviewState-'));

        savedWebviews.forEach(key => {
            const id = key.replace('webviewState-', '');
            const savedState = this.context.globalState.get(key);
    
            // Preserve the existing webviewPanel if it already exists in memory (this will happen when loadSavedWebviews is called due to refresh)
            if (webviews[id] && webviews[id].webviewPanel) {
                webviews[id] = {
                    ...savedState,
                    webviewPanel: webviews[id].webviewPanel
                };
            } else {
                webviews[id] = savedState;
            }
        });
    }    
}

function openWebview(context, id, name, treeDataProviderInstance) {

    if (webviews[id] && webviews[id].webviewPanel) {
        // If a webview with the same ID is already open, focus on it
        webviews[id].webviewPanel.reveal(vscode.ViewColumn.One);
        return;
    }

    // Create a new webview panel
    const panel = vscode.window.createWebviewPanel(
        id,
        name,
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            enableCommandUris:true
        }
    );

    const savedState = context.globalState.get(`webviewState-${id}`);
    panel.webview.html = getWebviewContent(savedState);

    panel.webview.onDidReceiveMessage(
        async message => {
            switch (message.command) {
                case 'submit':

                    const inputText = message.text;
                    const outputText = await runGeminiApi(inputText);

                    // Send the output text back to the webview
                    panel.webview.postMessage({
                        command: 'display',
                        text: outputText
                    });

                    const state = {
                        input: inputText,
                        output: outputText,
                        name: name // Save the webview name
                    };
                    context.globalState.update(`webviewState-${id}`, state);

                    // Save the panel in memory so that reveal/dispose can refer to it
                    webviews[id] = {
                        ...webviews[id], // Keep existing properties (like name)
                        input: inputText,
                        output: outputText,
                        webviewPanel: panel
                    };
                    break;

                case 'download':
                    try {
                        let fileName = 'testcases.json';  // Default file name
                        const webviewName = panel.title || 'testcases';  // Use the webview name if available
                        fileName = `${webviewName}.json`;
                
                        let defaultUri;
                        const workspaceFolders = vscode.workspace.workspaceFolders;
                
                        if (workspaceFolders && workspaceFolders.length > 0) {
                            // Save in the workspace folder
                            defaultUri = vscode.Uri.file(path.join(workspaceFolders[0].uri.fsPath, fileName));
                        } else {
                            // Save to the default location if no workspace is open(user's home directory or other standard location)
                            const homeDir = require('os').homedir();
                            defaultUri = vscode.Uri.file(path.join(homeDir, fileName));
                        }
                
                        const filePath = await vscode.window.showSaveDialog({
                            defaultUri: defaultUri,
                            filters: {
                                'JSON files': ['json']
                            }
                        });
                
                        if (filePath) {
                            fs.writeFileSync(filePath.fsPath, message.text);
                            vscode.window.showInformationMessage(`File saved successfully as ${fileName}`);
                        }

                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to save file: ${error.message}`);
                    }
                    return; 
                    
                    case 'downloadTxt':
                        try {
                            let fileName = 'testcases.txt';  // Default file name
                            const webviewName = panel.title || 'testcases';
                            fileName = `${webviewName}.txt`;
                    
                            let defaultUri;
                            const workspaceFolders = vscode.workspace.workspaceFolders;
                    
                            if (workspaceFolders && workspaceFolders.length > 0) {
                                // Save in the workspace folder
                                defaultUri = vscode.Uri.file(path.join(workspaceFolders[0].uri.fsPath, fileName));
                            } else {
                                // Save to the default location (user's home directory or other standard location)
                                const homeDir = require('os').homedir();
                                defaultUri = vscode.Uri.file(path.join(homeDir, fileName));
                            }
                    
                            const filePath = await vscode.window.showSaveDialog({
                                defaultUri: defaultUri,
                                filters: {
                                    'Text files': ['txt']
                                }
                            });
                    
                            if (filePath) {
                                fs.writeFileSync(filePath.fsPath, message.text);
                                vscode.window.showInformationMessage(`File saved successfully as ${fileName}`);
                            }
                        } catch (error) {
                            vscode.window.showErrorMessage(`Failed to save file: ${error.message}`);
                        }
                        return;
            }
        },
        undefined,
        context.subscriptions
    );

    panel.onDidDispose(() => {
        // Delete the panel reference when disposed
        delete webviews[id].webviewPanel;
        treeDataProviderInstance.refresh();
    });

    // Update the in memory variable
    webviews[id] = { name, webviewPanel: panel };

    // Refresh the Tree Data Provider
    treeDataProviderInstance.refresh();
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
