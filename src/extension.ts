import * as child_process from "child_process";
import { workspace, ExtensionContext, window, OutputChannel } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";

let client: LanguageClient;
let outputChannel: OutputChannel;

export function activate(context: ExtensionContext) {
  try {
    outputChannel = window.createOutputChannel("NPL Language Server");
    outputChannel.appendLine("NPL Language Server is now active!");
    outputChannel.show();

    // 创建一个自定义的服务器选项
    const serverOptions: ServerOptions = function () {
      return new Promise((resolve, reject) => {
        // 尝试启动 nextls
        const childProcess = child_process.spawn("nextls");

        childProcess.on("error", (err) => {
          window.showErrorMessage(`Failed to start nextls: ${err.message}`);
          reject(err);
        });

        childProcess.stderr.on("data", (data) => {
          console.error(`nextls stderr: ${data}`);
        });

        resolve(childProcess);
      });
    };

    // 控制语言客户端的选项
    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: "file", language: "next" },
        { scheme: "file", language: "npl" },
        { scheme: "file", language: "tmpl" },
        { scheme: "file", language: "gotmpl" },
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

    // 创建并启动语言客户端
    client = new LanguageClient(
      "nplLanguageServer",
      "NPL Language Server",
      serverOptions,
      clientOptions
    );

    outputChannel.appendLine("Starting language client...");
    outputChannel.show();

    // 启动客户端。这也会启动服务器
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
        // 添加更多的事件监听器
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
  return client.stop();
}
