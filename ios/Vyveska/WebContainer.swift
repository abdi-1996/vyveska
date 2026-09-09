import SwiftUI
import WebKit
import UniformTypeIdentifiers

final class LocalSchemeHandler: NSObject, WKURLSchemeHandler {
  func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
    guard let url = task.request.url else {
      task.didFailWithError(URLError(.badURL))
      return
    }

    var path = url.path
    if path.isEmpty || path == "/" {
      path = "/index.html"
    }

    guard let www = Bundle.main.resourceURL?.appendingPathComponent("www", isDirectory: true) else {
      task.didFailWithError(URLError(.fileDoesNotExist))
      return
    }

    let root = www.standardizedFileURL.path
    let candidate = www.appendingPathComponent(String(path.drop(while: { $0 == "/" }))).standardizedFileURL
    var filePath = candidate.path
    if !filePath.hasPrefix(root) {
      task.didFailWithError(URLError(.noPermissionsToReadFile))
      return
    }

    if !FileManager.default.fileExists(atPath: filePath) {
      let fallback = www.appendingPathComponent("index.html").path
      if FileManager.default.fileExists(atPath: fallback), !path.contains(".") {
        filePath = fallback
      } else {
        let body = Data("Not found".utf8)
        let response = HTTPURLResponse(
          url: url,
          statusCode: 404,
          httpVersion: "HTTP/1.1",
          headerFields: ["Content-Type": "text/plain; charset=utf-8"]
        )!
        task.didReceive(response)
        task.didReceive(body)
        task.didFinish()
        return
      }
    }

    do {
      let data = try Data(contentsOf: URL(fileURLWithPath: filePath))
      let mime = mimeType(for: filePath)
      let response = HTTPURLResponse(
        url: url,
        statusCode: 200,
        httpVersion: "HTTP/1.1",
        headerFields: [
          "Content-Type": mime,
          "Cache-Control": "no-cache",
          "Access-Control-Allow-Origin": "*",
        ]
      )!
      task.didReceive(response)
      task.didReceive(data)
      task.didFinish()
    } catch {
      task.didFailWithError(error)
    }
  }

  func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

  private func mimeType(for path: String) -> String {
    let ext = (path as NSString).pathExtension.lowercased()
    switch ext {
    case "html", "htm": return "text/html; charset=utf-8"
    case "js", "mjs": return "text/javascript; charset=utf-8"
    case "css": return "text/css; charset=utf-8"
    case "json": return "application/json"
    case "svg": return "image/svg+xml"
    case "png": return "image/png"
    case "jpg", "jpeg": return "image/jpeg"
    case "webp": return "image/webp"
    case "gif": return "image/gif"
    case "ttf": return "font/ttf"
    case "otf": return "font/otf"
    case "woff": return "font/woff"
    case "woff2": return "font/woff2"
    case "wasm": return "application/wasm"
    case "mp4": return "video/mp4"
    case "webmanifest": return "application/manifest+json"
    default:
      if let ut = UTType(filenameExtension: ext), let mime = ut.preferredMIMEType {
        return mime
      }
      return "application/octet-stream"
    }
  }
}

struct WebContainer: UIViewRepresentable {
  func makeUIView(context: Context) -> WKWebView {
    let config = WKWebViewConfiguration()
    let handler = context.coordinator.handler
    config.setURLSchemeHandler(handler, forURLScheme: "app")
    config.allowsInlineMediaPlayback = true
    config.mediaTypesRequiringUserActionForPlayback = []
    config.preferences.javaScriptCanOpenWindowsAutomatically = false
    let page = WKWebpagePreferences()
    page.allowsContentJavaScript = true
    config.defaultWebpagePreferences = page

    let webView = WKWebView(frame: .zero, configuration: config)
    webView.scrollView.bounces = false
    webView.scrollView.contentInsetAdjustmentBehavior = .never
    webView.isOpaque = false
    webView.backgroundColor = UIColor(red: 0.922, green: 0.906, blue: 0.878, alpha: 1)
    if #available(iOS 16.4, *) {
      webView.isInspectable = true
    }
    webView.load(URLRequest(url: URL(string: "app://localhost/index.html")!))
    return webView
  }

  func updateUIView(_ uiView: WKWebView, context: Context) {}

  func makeCoordinator() -> Coordinator {
    Coordinator()
  }

  final class Coordinator {
    let handler = LocalSchemeHandler()
  }
}
