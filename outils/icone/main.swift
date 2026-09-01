import Cocoa

// ============================================================================
//  LE LOGO DE L'EXTENSION
//
//  Aharon : « faut que le logo de l'extension fasse plus technologique. »
//
//  L'ancien reprenait la mascotte : sympathique, mais dans une barre d'onglets
//  a 16 pixels, un petit robot devient une tache. Celui-ci dessine ce que le
//  mot veut dire — un NEXUS, un point ou des liens se rejoignent : un noyau,
//  six branches, trois relais. Des formes franches, epaisses, qui tiennent
//  encore a 16 px.
//
//  Il est DESSINE, pas peint a la main dans un logiciel : on peut le refaire a
//  l'identique, en changer la couleur, et il ne se perd pas.
// ============================================================================

let tailles = [16, 48, 64, 128]
let sortie = "public/ext"

func couleur(_ r: Double, _ v: Double, _ b: Double, _ a: Double = 1) -> CGColor {
    CGColor(red: r/255, green: v/255, blue: b/255, alpha: a)
}

func dessiner(_ n: Int) -> Data? {
    let e = CGFloat(n)                       // cote
    guard let ctx = CGContext(data: nil, width: n, height: n, bitsPerComponent: 8,
                              bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { return nil }
    ctx.interpolationQuality = .high
    ctx.setAllowsAntialiasing(true)

    // -- La tuile : coins arrondis a la maniere de macOS, degrade profond ----
    let rayon = e * 0.225
    let tuile = CGPath(roundedRect: CGRect(x: 0, y: 0, width: e, height: e),
                       cornerWidth: rayon, cornerHeight: rayon, transform: nil)
    ctx.saveGState()
    ctx.addPath(tuile); ctx.clip()
    if let d = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                          colors: [couleur(24, 22, 56), couleur(10, 10, 22)] as CFArray,
                          locations: [0, 1]) {
        ctx.drawLinearGradient(d, start: CGPoint(x: 0, y: e), end: CGPoint(x: e, y: 0),
                               options: [])
    }

    // -- La grille de fond : discrete, elle dit « technique » sans crier -----
    //    Sautee en dessous de 32 px : a cette taille elle ne fait que salir.
    if n >= 32 {
        ctx.setStrokeColor(couleur(255, 255, 255, 0.055))
        ctx.setLineWidth(max(0.5, e * 0.006))
        let pas = e / 7
        for i in 1..<7 {
            let p = CGFloat(i) * pas
            ctx.move(to: CGPoint(x: p, y: 0)); ctx.addLine(to: CGPoint(x: p, y: e))
            ctx.move(to: CGPoint(x: 0, y: p)); ctx.addLine(to: CGPoint(x: e, y: p))
        }
        ctx.strokePath()
    }

    // -- Le nexus : un noyau, six branches, trois relais --------------------
    let c = CGPoint(x: e/2, y: e/2)
    let rBranche = e * 0.30
    let epais = max(1.4, e * 0.055)

    // Les branches, en dégradé du cyan vers l'indigo selon l'angle.
    let angles: [Double] = [90, 150, 210, 270, 330, 30]
    for (i, a) in angles.enumerated() {
        let rad = a * .pi / 180
        let bout = CGPoint(x: c.x + rBranche * CGFloat(cos(rad)),
                           y: c.y + rBranche * CGFloat(sin(rad)))
        // Une branche sur deux plus pale : le motif se lit meme minuscule.
        ctx.setStrokeColor(i % 2 == 0 ? couleur(125, 211, 252, 0.95)
                                      : couleur(129, 140, 248, 0.85))
        ctx.setLineWidth(epais)
        ctx.setLineCap(.round)
        ctx.move(to: c); ctx.addLine(to: bout)
        ctx.strokePath()
    }

    // Trois relais, aux angles pairs : trois points valent mieux que six a
    // 16 px, ou tout se touche.
    let rRelais = max(1.2, e * 0.072)
    for a in [90.0, 210.0, 330.0] {
        let rad = a * .pi / 180
        let p = CGPoint(x: c.x + rBranche * CGFloat(cos(rad)),
                        y: c.y + rBranche * CGFloat(sin(rad)))
        ctx.setFillColor(couleur(125, 211, 252))
        ctx.fillEllipse(in: CGRect(x: p.x - rRelais, y: p.y - rRelais,
                                   width: rRelais*2, height: rRelais*2))
    }

    // Le noyau : un disque clair, cercle sombre au centre — un « point de
    // jonction », pas une simple bille.
    let rNoyau = e * 0.145
    ctx.setFillColor(couleur(238, 242, 255))
    ctx.fillEllipse(in: CGRect(x: c.x - rNoyau, y: c.y - rNoyau,
                               width: rNoyau*2, height: rNoyau*2))
    if n >= 32 {
        let rTrou = e * 0.055
        ctx.setFillColor(couleur(20, 18, 48))
        ctx.fillEllipse(in: CGRect(x: c.x - rTrou, y: c.y - rTrou,
                                   width: rTrou*2, height: rTrou*2))
    }
    ctx.restoreGState()

    // -- Le liseré du haut : la lumière qui donne le relief ------------------
    ctx.saveGState()
    ctx.addPath(tuile); ctx.clip()
    ctx.setStrokeColor(couleur(255, 255, 255, 0.20))
    ctx.setLineWidth(max(1, e * 0.012))
    ctx.addPath(tuile); ctx.strokePath()
    ctx.restoreGState()

    guard let img = ctx.makeImage() else { return nil }
    let rep = NSBitmapImageRep(cgImage: img)
    return rep.representation(using: .png, properties: [:])
}

var faits: [String] = []
for t in tailles {
    guard let d = dessiner(t) else { print("  ✗ \(t) px : échec"); continue }
    let f = "\(sortie)/icone-\(t).png"
    do { try d.write(to: URL(fileURLWithPath: f)); faits.append("\(t) px") }
    catch { print("  ✗ \(f) : \(error.localizedDescription)") }
}
print("  ✓ logo redessiné : " + faits.joined(separator: ", "))
print("    un noyau, six branches, trois relais — lisible jusqu'à 16 px.")
