cask "litebridge-desktop" do
  arch arm: "aarch64", intel: "x64"

  version "1.1.3"
  sha256 :no_check

  url "https://github.com/lucascborges/LiteBridge-Desktop/releases/download/v#{version}/LiteBridge.Desktop_#{version}_#{arch}.dmg",
      verified: "github.com/lucascborges/LiteBridge-Desktop/"
  name "LiteBridge Desktop"
  desc "Open-Source Desktop Orchestrator for LiteLLM & Local AI Agent Harnesses"
  homepage "https://github.com/lucascborges/LiteBridge-Desktop"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true

  app "LiteBridge Desktop.app"

  zap trash: [
    "~/Library/Application Support/com.litebridge.desktop",
    "~/Library/Caches/com.litebridge.desktop",
    "~/Library/Preferences/com.litebridge.desktop.plist",
    "~/Library/Saved Application State/com.litebridge.desktop.savedState",
  ]
end
