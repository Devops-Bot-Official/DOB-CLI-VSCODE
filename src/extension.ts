import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('dobView', new DobPanelProvider(context))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dob.showPanel', () => {
      vscode.commands.executeCommand('workbench.view.extension.dobSidebar');
    })
  );
}

class DobPanelProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(
    view: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    view.webview.options = {
      enableScripts: true
    };

    view.webview.html = this.getHtmlForWebview();

    view.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'saveConfig') {
        const config = msg.data;
        const configPath = path.join(os.homedir(), '.dobconfig.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        vscode.window.showInformationMessage(`✅ Config saved to ${configPath}`);
      }

      if (msg.type === 'runCommand') {
        const { command } = msg.data;
        const term = vscode.window.createTerminal("DOB CLI");
        term.show(true);
        term.sendText(`dob ${command}`);
      }
    });
  }

  private getHtmlForWebview(): string {
    return `
      <html>
        <body>
          <h2>DOB CLI Panel</h2>
          <form id="dob-form">
            <label>Persona Name:</label><br>
            <input type="text" id="persona_name" required /><br>
            <label>Token:</label><br>
            <input type="text" id="token" required /><br>
            <label>Private Key Path:</label><br>
            <input type="text" id="private_key_path" value="~/.alice.pem" /><br>
            <label>Host Endpoint:</label><br>
            <input type="text" id="host_endpoint" value="http://localhost:8000" /><br><br>
            <button type="submit">💾 Save Config</button>
          </form>

          <hr />

          <label>DOB Command:</label><br>
          <input type="text" id="dob-command" placeholder="e.g. vault show" />
          <button onclick="runCommand()">▶ Run</button>

          <script>
            const vscode = acquireVsCodeApi();

            document.getElementById("dob-form").addEventListener("submit", function(e) {
              e.preventDefault();
              const config = {
                persona_name: document.getElementById("persona_name").value,
                token: document.getElementById("token").value,
                private_key_path: document.getElementById("private_key_path").value,
                host_endpoint: document.getElementById("host_endpoint").value,
              };
              vscode.postMessage({ type: "saveConfig", data: config });
            });

            function runCommand() {
              const command = document.getElementById("dob-command").value;
              vscode.postMessage({ type: "runCommand", data: { command } });
            }
          </script>
        </body>
      </html>
    `;
  }
}

export function deactivate() {}
