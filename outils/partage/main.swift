import Cocoa

// ============================================================================
//  L'IMAGE DE PARTAGE
//
//  Quand Aharon enverra son lien sur WhatsApp, Discord ou Instagram, c'est
//  CETTE image qui s'affichera. Sans elle, le lien arrive nu — un rectangle
//  gris avec une adresse, qui ressemble a un lien mort. Personne ne clique.
//
//  1200 x 630 : la taille que tout le monde attend (Open Graph).
//  Dessinee, comme le logo : refaisable, et elle ne se perd pas.
// ============================================================================

let L = 1200.0, H = 630.0

func c(_ r: Double, _ v: Double, _ b: Double, _ a: Double = 1) -> CGColor {
    CGColor(red: r/255, green: v/255, blue: b/255, alpha: a)
}

guard let ctx = CGContext(data: nil, width: Int(L), height: Int(H), bitsPerComponent: 8,
                          bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
else { print("  ✗ impossible de préparer l'image"); exit(1) }

// -- Le fond : la nuit de Nexus, avec une lueur qui monte du bas ------------
ctx.setFillColor(c(9, 9, 18)); ctx.fill(CGRect(x: 0, y: 0, width: L, height: H))
if let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                      colors: [c(99, 102, 241, 0.34), c(9, 9, 18, 0)] as CFArray,
                      locations: [0, 1]) {
    ctx.drawRadialGradient(g, startCenter: CGPoint(x: L*0.26, y: -60), startRadius: 0,
                           endCenter: CGPoint(x: L*0.26, y: -60), endRadius: 720, options: [])
}
if let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                      colors: [c(56, 189, 248, 0.22), c(9, 9, 18, 0)] as CFArray,
                      locations: [0, 1]) {
    ctx.drawRadialGradient(g, startCenter: CGPoint(x: L*0.92, y: H*0.92), startRadius: 0,
                           endCenter: CGPoint(x: L*0.92, y: H*0.92), endRadius: 560, options: [])
}

// -- La grille, tres discrete ----------------------------------------------
ctx.setStrokeColor(c(255, 255, 255, 0.035)); ctx.setLineWidth(1)
for i in stride(from: 0.0, through: L, by: 60) {
    ctx.move(to: CGPoint(x: i, y: 0)); ctx.addLine(to: CGPoint(x: i, y: H))
}
for j in stride(from: 0.0, through: H, by: 60) {
    ctx.move(to: CGPoint(x: 0, y: j)); ctx.addLine(to: CGPoint(x: L, y: j))
}
ctx.strokePath()

// -- Le nexus, a droite : le meme signe que le logo -------------------------
let cx = L * 0.795, cy = H * 0.50, r = 132.0
for (i, a) in [90.0, 150, 210, 270, 330, 30].enumerated() {
    let rad = a * .pi/180
    ctx.setStrokeColor(i % 2 == 0 ? c(125, 211, 252, 0.95) : c(129, 140, 248, 0.85))
    ctx.setLineWidth(13); ctx.setLineCap(.round)
    ctx.move(to: CGPoint(x: cx, y: cy))
    ctx.addLine(to: CGPoint(x: cx + r*cos(rad), y: cy + r*sin(rad)))
    ctx.strokePath()
}
for a in [90.0, 210, 330] {
    let rad = a * .pi/180
    let p = CGPoint(x: cx + r*cos(rad), y: cy + r*sin(rad))
    ctx.setFillColor(c(125, 211, 252))
    ctx.fillEllipse(in: CGRect(x: p.x-24, y: p.y-24, width: 48, height: 48))
}
ctx.setFillColor(c(238, 242, 255))
ctx.fillEllipse(in: CGRect(x: cx-56, y: cy-56, width: 112, height: 112))
ctx.setFillColor(c(16, 15, 42))
ctx.fillEllipse(in: CGRect(x: cx-21, y: cy-21, width: 42, height: 42))

// -- Le texte, a gauche -----------------------------------------------------
func ecrire(_ t: String, _ x: Double, _ y: Double, _ taille: Double,
            _ poids: NSFont.Weight, _ coul: NSColor, espacement: Double = 0) {
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: taille, weight: poids),
        .foregroundColor: coul,
        .kern: espacement,
    ]
    let s = NSAttributedString(string: t, attributes: attrs)
    let ancien = NSGraphicsContext.current
    NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: false)
    s.draw(at: NSPoint(x: x, y: y))
    NSGraphicsContext.current = ancien
}

ecrire("NEXUS", 96, H - 232, 96, .bold, NSColor.white, espacement: 2)
ecrire("Ton espace de travail tout-en-un.", 100, H - 300, 34, .regular,
       NSColor(white: 1, alpha: 0.80))
ecrire("Intelligences artificielles · notes · révisions · outils · détente",
       100, H - 352, 23, .regular, NSColor(white: 1, alpha: 0.52))
ecrire("Sur le web, sur ton Mac, dans chaque onglet.",
       100, H - 452, 22, .medium, NSColor(red: 0.49, green: 0.83, blue: 0.99, alpha: 1))

// En JPEG, pas en PNG : cette image part a CHAQUE partage, et le PNG pesait
// 617 Ko pour un dessin plein de degrades — le format le moins fait pour ça.
// En JPEG de bonne qualite, 76 Ko : huit fois plus leger, sans difference
// visible sur un fond sombre.
guard let img = ctx.makeImage(),
      let d = NSBitmapImageRep(cgImage: img)
        .representation(using: .jpeg, properties: [.compressionFactor: 0.86])
else { print("  ✗ échec du rendu"); exit(1) }
try? d.write(to: URL(fileURLWithPath: "public/partage.jpg"))
try? FileManager.default.removeItem(atPath: "public/partage.png")
print("  ✓ public/partage.jpg — 1200 × 630, \(d.count / 1024) Ko")
