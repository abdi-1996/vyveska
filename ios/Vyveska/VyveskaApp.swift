import SwiftUI

@main
struct VyveskaApp: App {
  var body: some Scene {
    WindowGroup {
      WebContainer()
        .ignoresSafeArea()
        .preferredColorScheme(.light)
    }
  }
}
