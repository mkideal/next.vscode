import * as child_process from "child_process";
import { workspace, ExtensionContext, window, OutputChannel } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";

let client: LanguageClient;
let outputChannel: OutputChannel;
let nextlsProcess: child_process.ChildProcess | null = null;

export function activate(context: ExtensionContext) {
  try {
    outputChannel = window.createOutputChannel("NPL Language Server");
    outputChannel.appendLine("NPL Language Server is now active!");
    outputChannel.show();

    const config = workspace.getConfiguration('nextls');
    const executablePath = config.get<string>('executablePath', 'nextls');

    const serverOptions: ServerOptions = function () {
      return new Promise((resolve, reject) => {
        nextlsProcess = child_process.spawn(executablePath);
        nextlsProcess.on("error", (err) => {
          window.showErrorMessage(`Failed to start nextls: ${err.message}`);
          reject(err);
        });
        if (nextlsProcess.stderr) {
          nextlsProcess.stderr.on("data", (data) => {
            console.error(`nextls stderr: ${data}`);
          });
        }

        resolve(nextlsProcess);
      });
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: "file", language: "next" },
        { scheme: "file", language: "npl" },
      ],
      synchronize: {
        fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
      },
      middleware: {
        provideDocumentSemanticTokens: (document, token, next) => {
          outputChannel.appendLine(
            `Requesting semantic tokens for ${document.uri.toString()}`
          );
          return next(document, token);
        },
      },
    };

    outputChannel.appendLine("Creating language client...");

    client = new LanguageClient(
      "nextLanguageServer",
      "Next Language Server",
      serverOptions,
      clientOptions
    );

    outputChannel.appendLine("Starting language client...");
    outputChannel.show();

    var disposable = client.start();

    outputChannel.appendLine(
      "Language client started, waiting for ready event..."
    );
    outputChannel.show();

    client
      .onReady()
      .then(() => {
        outputChannel.appendLine("Language server is ready.");
        outputChannel.appendLine("Server capabilities:");
        outputChannel.appendLine(
          JSON.stringify(client.initializeResult?.capabilities, null, 2)
        );
        outputChannel.appendLine("Adding event listeners...");

        client.onDidChangeState((e) => {
          outputChannel.appendLine(
            `Client state changed from ${e.oldState} to ${e.newState}`
          );
        });

        client.onNotification("window/logMessage", (params) => {
          outputChannel.appendLine(`Server log: ${params.message}`);
        });
      })
      .catch((reason) => {
        outputChannel.appendLine(`Failed to start language client: ${reason}`);
      });

    outputChannel.appendLine("Adding disposable to context.subscriptions");
    context.subscriptions.push(disposable);
    outputChannel.appendLine("NPL Language Server activation completed");
  } catch (error) {
    outputChannel.appendLine(`Error: ${error}`);
    outputChannel.show();
  }
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop().then(() => {
    if (nextlsProcess) {
      nextlsProcess.kill();
      nextlsProcess = null;
    }
  });
}
