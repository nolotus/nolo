import AppKit
import Foundation
import ImageIO
import UniformTypeIdentifiers

enum IconBuildError: Error {
  case invalidArguments
  case failedToLoadImage(String)
  case failedToEncode(String)
}

func main() throws {
  let args = CommandLine.arguments
  guard args.count == 3 else {
    throw IconBuildError.invalidArguments
  }

  let inputURL = URL(fileURLWithPath: args[1])
  let outputURL = URL(fileURLWithPath: args[2])

  guard let sourceImage = NSImage(contentsOf: inputURL) else {
    throw IconBuildError.failedToLoadImage(inputURL.path)
  }

  guard let destination = CGImageDestinationCreateWithURL(
    outputURL as CFURL,
    UTType.icns.identifier as CFString,
    10,
    nil
  ) else {
    throw IconBuildError.failedToEncode(outputURL.path)
  }

  let sizes = [16, 32, 32, 64, 128, 256, 256, 512, 512, 1024]
  let names = [
    "icon_16x16",
    "icon_16x16@2x",
    "icon_32x32",
    "icon_32x32@2x",
    "icon_128x128",
    "icon_128x128@2x",
    "icon_256x256",
    "icon_256x256@2x",
    "icon_512x512",
    "icon_512x512@2x",
  ]

  for (index, size) in sizes.enumerated() {
    let imageSize = NSSize(width: size, height: size)
    let rep = NSBitmapImageRep(
      bitmapDataPlanes: nil,
      pixelsWide: size,
      pixelsHigh: size,
      bitsPerSample: 8,
      samplesPerPixel: 4,
      hasAlpha: true,
      isPlanar: false,
      colorSpaceName: .deviceRGB,
      bytesPerRow: 0,
      bitsPerPixel: 0
    )

    guard let bitmapRep = rep else {
      throw IconBuildError.failedToEncode("bitmap rep: \(names[index])")
    }

    bitmapRep.size = imageSize
    NSGraphicsContext.saveGraphicsState()
    guard let context = NSGraphicsContext(bitmapImageRep: bitmapRep) else {
      throw IconBuildError.failedToEncode("graphics context: \(names[index])")
    }
    NSGraphicsContext.current = context
    sourceImage.draw(
      in: NSRect(origin: .zero, size: imageSize),
      from: .zero,
      operation: .copy,
      fraction: 1.0
    )
    context.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()

    guard let cgImage = bitmapRep.cgImage else {
      throw IconBuildError.failedToEncode("cgImage: \(names[index])")
    }

    CGImageDestinationAddImage(destination, cgImage, nil)
  }

  if !CGImageDestinationFinalize(destination) {
    throw IconBuildError.failedToEncode(outputURL.path)
  }
}

do {
  try main()
} catch IconBuildError.invalidArguments {
  fputs("usage: generate-mac-icon.swift <input-png> <output-icns>\n", stderr)
  exit(1)
} catch IconBuildError.failedToLoadImage(let path) {
  fputs("failed to load image: \(path)\n", stderr)
  exit(1)
} catch IconBuildError.failedToEncode(let path) {
  fputs("failed to encode icns: \(path)\n", stderr)
  exit(1)
} catch {
  fputs("unexpected error: \(error)\n", stderr)
  exit(1)
}
