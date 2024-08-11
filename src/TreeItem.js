const vscode = require('vscode');

class TreeItem extends vscode.TreeItem {

    constructor(label, id) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.id = id;
        this.contextValue = 'webviewItem'; 
        this.command = {
            command: id ? 'testcase-factory.openExistingPanel' : 'testcase-factory.openNamedPanel',
            title: 'Open Webview',
            arguments: id ? [id] : []
        };
        if (label === 'CREATE NEW PANEL') {
            this.iconPath = new vscode.ThemeIcon('play-circle'); 
            this.tooltip = '(Right Click for more options)'; 
        }
    }

}

module.exports = TreeItem;