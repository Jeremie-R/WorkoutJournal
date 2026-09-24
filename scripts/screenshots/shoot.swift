// Takes screenshots of a web page with the system WebKit, in a hidden window with throwaway storage.
// Usage: swift shoot.swift config.json (see plan.mjs for the config format)
import Cocoa
import WebKit

struct Step: Decodable {
    var url: String?
    var js: String?
    var wait: Double?
    var shot: String?
}

struct Config: Decodable {
    var width: Double
    var height: Double
    var quality: Double
    var outDir: String
    var steps: [Step]
}

@MainActor
final class Shooter: NSObject, WKNavigationDelegate {
    let web: WKWebView
    let window: NSWindow
    var loaded: CheckedContinuation<Void, Never>?

    init(width: Double, height: Double) {
        let conf = WKWebViewConfiguration()
        conf.websiteDataStore = .nonPersistent()
        // Freeze animations so every capture is steady.
        let css = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} html{scrollbar-width:none} ::-webkit-scrollbar{display:none}"
        let freeze = "document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='\(css)';document.head.appendChild(s)})"
        conf.userContentController.addUserScript(WKUserScript(source: freeze, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: width, height: height), configuration: conf)
        window = NSWindow(contentRect: NSRect(x: -6000, y: -6000, width: width, height: height), styleMask: [.borderless], backing: .buffered, defer: false)
        super.init()
        web.navigationDelegate = self
        window.contentView = web
        window.orderFrontRegardless()
    }

    nonisolated func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        MainActor.assumeIsolated {
            loaded?.resume()
            loaded = nil
        }
    }

    func load(_ address: String) async {
        let url = URL(string: address)!
        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
            loaded = c
            if url.isFileURL {
                web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
            } else {
                web.load(URLRequest(url: url))
            }
        }
    }

    func run(_ js: String) async throws {
        _ = try await web.callAsyncJavaScript(js, arguments: [:], in: nil, contentWorld: .page)
    }

    func shot(_ path: String, quality: Double) async throws {
        let conf = WKSnapshotConfiguration()
        conf.rect = web.bounds
        let image = try await web.takeSnapshot(configuration: conf)
        guard let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { throw NSError(domain: "shot", code: 1) }
        let rep = NSBitmapImageRep(cgImage: cg)
        let type: NSBitmapImageRep.FileType = path.hasSuffix(".png") ? .png : .jpeg
        guard let data = rep.representation(using: type, properties: [.compressionFactor: quality]) else { throw NSError(domain: "shot", code: 2) }
        try data.write(to: URL(fileURLWithPath: path))
        print("saved \(path) \(cg.width)x\(cg.height)")
    }
}

let config = try JSONDecoder().decode(Config.self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
let app = NSApplication.shared
app.setActivationPolicy(.prohibited)

Task { @MainActor in
    let shooter = Shooter(width: config.width, height: config.height)
    do {
        for step in config.steps {
            if let url = step.url { await shooter.load(url) }
            if let js = step.js { try await shooter.run(js) }
            if let wait = step.wait { try await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000)) }
            if let name = step.shot { try await shooter.shot("\(config.outDir)/\(name)", quality: config.quality) }
        }
    } catch {
        print("error: \(error)")
        exit(1)
    }
    exit(0)
}
app.run()
