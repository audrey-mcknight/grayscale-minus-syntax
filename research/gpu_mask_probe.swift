// Synthetic Metal microbenchmark. No windows, screen capture, browser access, or persistent process.
import Foundation
import Metal

enum ProbeError: Error { case noDevice, setup, command }
guard let device = MTLCreateSystemDefaultDevice(), let queue = device.makeCommandQueue() else { throw ProbeError.noDevice }
let source = """
#include <metal_stdlib>
using namespace metal;
kernel void pattern(texture2d<float, access::write> image [[texture(0)]], uint2 p [[thread_position_in_grid]]) {
  if (p.x >= image.get_width() || p.y >= image.get_height()) return;
  image.write(float4(float(p.x % 251) / 250., float(p.y % 239) / 238., .8, 1.), p);
}
kernel void selective_gray(texture2d<float, access::read> image [[texture(0)]],
                           texture2d<float, access::write> output [[texture(1)]],
                           constant uint& enabled [[buffer(0)]],
                           constant float4& protectedRect [[buffer(1)]], uint2 p [[thread_position_in_grid]]) {
  if (p.x >= output.get_width() || p.y >= output.get_height()) return;
  float4 color = image.read(p);
  bool preserve = p.x >= protectedRect.x && p.y >= protectedRect.y && p.x < protectedRect.z && p.y < protectedRect.w;
  if (enabled && !preserve) {
    float gray = dot(color.rgb, float3(.2126, .7152, .0722));
    color.rgb = float3(gray);
  }
  output.write(color, p);
}
"""
let library = try device.makeLibrary(source: source, options: nil)
guard let pattern = library.makeFunction(name: "pattern"), let selective = library.makeFunction(name: "selective_gray") else { throw ProbeError.setup }
let generate = try device.makeComputePipelineState(function: pattern)
let filter = try device.makeComputePipelineState(function: selective)

func run(_ pipeline: MTLComputePipelineState, input: MTLTexture, output: MTLTexture?, enabled: UInt32, rect: SIMD4<Float>) throws -> Double {
    guard let command = queue.makeCommandBuffer(), let encoder = command.makeComputeCommandEncoder() else { throw ProbeError.setup }
    encoder.setComputePipelineState(pipeline)
    encoder.setTexture(input, index: 0)
    if let output = output {
        encoder.setTexture(output, index: 1)
        var enabled = enabled, rect = rect
        encoder.setBytes(&enabled, length: MemoryLayout<UInt32>.size, index: 0)
        encoder.setBytes(&rect, length: MemoryLayout<SIMD4<Float>>.size, index: 1)
    }
    let width = pipeline.threadExecutionWidth
    let height = min(8, pipeline.maxTotalThreadsPerThreadgroup / width)
    encoder.dispatchThreads(MTLSize(width: input.width, height: input.height, depth: 1),
                            threadsPerThreadgroup: MTLSize(width: width, height: height, depth: 1))
    encoder.endEncoding()
    command.commit()
    command.waitUntilCompleted()
    guard command.status == .completed else { throw ProbeError.command }
    return (command.gpuEndTime - command.gpuStartTime) * 1000
}
func pixel(_ texture: MTLTexture, _ x: Int, _ y: Int) -> [UInt8] {
    var bytes = [UInt8](repeating: 0, count: 4)
    bytes.withUnsafeMutableBytes {
        texture.getBytes($0.baseAddress!, bytesPerRow: 4, from: MTLRegionMake2D(x, y, 1, 1), mipmapLevel: 0)
    }
    return bytes
}
func median(_ values: [Double]) -> Double { values.sorted()[values.count / 2] }
var results: [[String: Any]] = []
for (width, height) in [(1920, 1080), (3840, 2160)] {
    let descriptor = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .rgba8Unorm, width: width, height: height, mipmapped: false)
    descriptor.storageMode = .shared
    descriptor.usage = [.shaderRead, .shaderWrite]
    guard let input = device.makeTexture(descriptor: descriptor), let output = device.makeTexture(descriptor: descriptor) else { throw ProbeError.setup }
    let rect = SIMD4<Float>(Float(width) / 3, Float(height) / 3, Float(width) * 2 / 3, Float(height) * 2 / 3)
    _ = try run(generate, input: input, output: nil, enabled: 0, rect: rect)
    for _ in 0..<5 { _ = try run(filter, input: input, output: output, enabled: 1, rect: rect) }
    var baseline: [Double] = [], grayscale: [Double] = []
    for _ in 0..<30 {
        baseline.append(try run(filter, input: input, output: output, enabled: 0, rect: rect))
        grayscale.append(try run(filter, input: input, output: output, enabled: 1, rect: rect))
    }
    let outside = pixel(output, 10, 10)
    let inside = pixel(output, width / 2, height / 2)
    let originalInside = pixel(input, width / 2, height / 2)
    guard outside[0] == outside[1], outside[1] == outside[2], inside == originalInside else { throw ProbeError.command }
    results.append([
        "width": width, "height": height, "samplesPerMode": 30,
        "passthroughMedianGPUms": median(baseline), "selectiveGrayscaleMedianGPUms": median(grayscale),
        "grayOutsideRegionVerified": true, "originalColorInsideRegionVerified": true,
        "syntheticInputAndOutputBytes": width * height * 4 * 2,
        "mask": "one analytical rectangle; no mask image allocated"
    ])
}
let result: [String: Any] = ["device": device.name, "screenCaptureUsed": false,
    "chromeIntegrationTested": false, "batteryMeasured": false, "results": results,
    "limitations": "Measures a simple SDR shader on synthetic textures only. Excludes Chrome pixel access, window composition, region detection/tracking, HDR/color management, and real application energy use."]
let data = try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys])
print(String(data: data, encoding: .utf8)!)
