import { useState, useRef, useEffect, type ChangeEvent } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  QrCode,
  Scan,
  Download,
  Copy,
  Check,
  Upload,
  Camera,
  Globe,
  Wifi,
  Mail,
  Phone,
  User,
  FileText,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Trash2,
  Share2
} from "lucide-react";

type QRType = "url" | "text" | "wifi" | "vcard" | "email" | "phone";

interface QRHistoryItem {
  id: string;
  type: "generated" | "scanned";
  content: string;
  label: string;
  timestamp: string;
}

export default function QRCodeApp() {
  const [activeTab, setActiveTab] = useState<"generate" | "scan" | "history">("generate");

  // Generator States
  const [qrType, setQrType] = useState<QRType>("url");
  const [urlInput, setUrlInput] = useState("https://google.com");
  const [textInput, setTextInput] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiEnc, setWifiEnc] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [vcardName, setVcardName] = useState("");
  const [vcardPhone, setVcardPhone] = useState("");
  const [vcardEmail, setVcardEmail] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [phoneNum, setPhoneNum] = useState("");

  // Styling States
  const [fgColor, setFgColor] = useState("#38bdf8");
  const [bgColor, setBgColor] = useState("#090d16");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Scanner States
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // History State
  const [history, setHistory] = useState<QRHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_qr_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveHistory = (item: QRHistoryItem) => {
    const updated = [item, ...history.filter((h) => h.content !== item.content)].slice(0, 30);
    setHistory(updated);
    try {
      localStorage.setItem("nexus_qr_history", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("nexus_qr_history");
  };

  // Compute final QR content string
  const getRawContent = (): string => {
    switch (qrType) {
      case "url":
        return urlInput.startsWith("http://") || urlInput.startsWith("https://")
          ? urlInput
          : `https://${urlInput}`;
      case "text":
        return textInput || "Nexus Studio QR";
      case "wifi":
        return `WIFI:S:${wifiSsid};T:${wifiEnc};P:${wifiPass};;`;
      case "vcard":
        return `BEGIN:VCARD\nVERSION:3.0\nN:${vcardName}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nEND:VCARD`;
      case "email":
        return `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}`;
      case "phone":
        return `tel:${phoneNum}`;
      default:
        return urlInput;
    }
  };

  // Generate QR Code Data URL on content or color change
  useEffect(() => {
    const raw = getRawContent();
    if (!raw.trim()) return;

    QRCode.toDataURL(raw, {
      width: 400,
      margin: 2,
      color: {
        dark: fgColor,
        light: bgColor,
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => console.error("QR Generation error", err));
  }, [
    qrType,
    urlInput,
    textInput,
    wifiSsid,
    wifiPass,
    wifiEnc,
    vcardName,
    vcardPhone,
    vcardEmail,
    emailTo,
    emailSubject,
    phoneNum,
    fgColor,
    bgColor,
  ]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qrcode_nexus_${Date.now()}.png`;
    a.click();

    saveHistory({
      id: `gen-${Date.now()}`,
      type: "generated",
      content: getRawContent(),
      label: `QR ${qrType.toUpperCase()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  };

  const handleCopyLink = () => {
    const raw = getRawContent();
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Image Upload Scanner
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    setScanResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          setScanResult(code.data);
          saveHistory({
            id: `scan-${Date.now()}`,
            type: "scanned",
            content: code.data,
            label: "QR Scanné par Image",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });
        } else {
          setScanError("Aucun QR code détecté dans cette image. Essayez une image plus nette.");
        }
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Live Camera Scanner
  const startCamera = async () => {
    setIsCameraActive(true);
    setScanError(null);
    setScanResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();

        const scanFrame = () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const video = videoRef.current;
            const canvas = canvasRef.current || document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (ctx) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height);

              if (code) {
                setScanResult(code.data);
                stopCamera();
                saveHistory({
                  id: `scan-${Date.now()}`,
                  type: "scanned",
                  content: code.data,
                  label: "QR Scanné par Caméra",
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                });
                return;
              }
            }
          }
          animFrameIdRef.current = requestAnimationFrame(scanFrame);
        };

        animFrameIdRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      console.error(err);
      setScanError("Impossible d'accéder à la caméra. Vérifiez vos autorisations.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-100 flex-col overflow-hidden">
      {/* Top Header Navigation Tabs */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-white">QR Code Studio Pro</h2>
            <p className="text-[10px] text-slate-400">Générateur & Scanner Haute Précision</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
          <button
            onClick={() => {
              stopCamera();
              setActiveTab("generate");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "generate"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Créer</span>
          </button>

          <button
            onClick={() => setActiveTab("scan")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "scan"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Scanner</span>
          </button>

          <button
            onClick={() => {
              stopCamera();
              setActiveTab("history");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === "history"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Historique ({history.length})</span>
          </button>
        </div>
      </div>

      {/* Main Body Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* TAB 1: GENERATE */}
        {activeTab === "generate" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-5xl mx-auto">
            {/* Left Controls Column */}
            <div className="md:col-span-7 space-y-4">
              {/* Type Selection Chips */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Type de Contenu
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "url", label: "Lien Web", icon: Globe },
                    { id: "text", label: "Texte Libre", icon: FileText },
                    { id: "wifi", label: "Réseau Wi-Fi", icon: Wifi },
                    { id: "vcard", label: "Contact vCard", icon: User },
                    { id: "email", label: "E-mail Direct", icon: Mail },
                    { id: "phone", label: "Téléphone", icon: Phone },
                  ].map((t) => {
                    const IconComp = t.icon;
                    const isSel = qrType === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setQrType(t.id as QRType)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSel
                            ? "bg-cyan-500/20 border-cyan-500 text-cyan-200 shadow-md"
                            : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Inputs depending on Type */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                {qrType === "url" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Adresse URL du Site</label>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://exemple.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>
                )}

                {qrType === "text" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Texte ou Message</label>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Écrivez votre message à encoder..."
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60 resize-none"
                    />
                  </div>
                )}

                {qrType === "wifi" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">Nom du Wi-Fi (SSID)</label>
                      <input
                        type="text"
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        placeholder="MonRéseauMaison"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">Mot de Passe</label>
                      <input
                        type="password"
                        value={wifiPass}
                        onChange={(e) => setWifiPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                      />
                    </div>
                  </div>
                )}

                {qrType === "vcard" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">Nom Complet</label>
                      <input
                        type="text"
                        value={vcardName}
                        onChange={(e) => setVcardName(e.target.value)}
                        placeholder="Jean Dupont"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">Téléphone</label>
                      <input
                        type="tel"
                        value={vcardPhone}
                        onChange={(e) => setVcardPhone(e.target.value)}
                        placeholder="+33 6 12 34 56 78"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">E-mail</label>
                      <input
                        type="email"
                        value={vcardEmail}
                        onChange={(e) => setVcardEmail(e.target.value)}
                        placeholder="jean@exemple.fr"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                      />
                    </div>
                  </div>
                )}

                {qrType === "email" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">Destinataire E-mail</label>
                      <input
                        type="email"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        placeholder="contact@entreprise.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 mb-1 block">Sujet du Message</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Demande de renseignements"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                      />
                    </div>
                  </div>
                )}

                {qrType === "phone" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1 block">Numéro de Téléphone</label>
                    <input
                      type="tel"
                      value={phoneNum}
                      onChange={(e) => setPhoneNum(e.target.value)}
                      placeholder="+33 6 00 00 00 00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>
                )}
              </div>

              {/* Color Styling Controls */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-300 block">Personnalisation des Couleurs</label>
                  <p className="text-[10px] text-slate-500">Couleur des motifs et fond</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold">Motif :</span>
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="w-7 h-7 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold">Fond :</span>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-7 h-7 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Preview & Download Column */}
            <div className="md:col-span-5 flex flex-col items-center justify-center bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Aperçu Direct
              </span>

              {qrDataUrl ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex items-center justify-center">
                  <img
                    src={qrDataUrl}
                    alt="QR Code Généré"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-slate-950 border border-dashed border-slate-800 rounded-2xl flex items-center justify-center text-slate-600">
                  <QrCode className="w-12 h-12" />
                </div>
              )}

              {/* Download & Copy Buttons */}
              <div className="w-full flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleDownload}
                  disabled={!qrDataUrl}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-40"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger PNG</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  disabled={!qrDataUrl}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-950 border border-slate-800 hover:border-cyan-500/40 text-slate-200 hover:text-white rounded-xl font-semibold text-xs transition-all disabled:opacity-40"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Copié !" : "Copier"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SCANNER */}
        {activeTab === "scan" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Live Webcam Scan */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Scanner avec la Caméra</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Utilisez la webcam pour viser le QR Code en direct</p>
                </div>

                {!isCameraActive ? (
                  <button
                    onClick={startCamera}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-xs shadow-lg transition-all"
                  >
                    Activer la Caméra
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="w-full py-2.5 px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl font-bold text-xs transition-all"
                  >
                    Arrêter la Caméra
                  </button>
                )}
              </div>

              {/* Option 2: Upload File / Drag & Drop */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col items-center text-center space-y-3">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Importer une Image</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Sélectionnez une photo ou capture d'écran contenant un QR</p>
                </div>

                <label className="w-full py-2.5 px-4 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-slate-200 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Choisir un fichier</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Live Camera Viewport Modal Container */}
            {isCameraActive && (
              <div className="relative w-full max-w-md mx-auto aspect-video bg-black rounded-2xl overflow-hidden border border-cyan-500/50 shadow-2xl">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scan Target Box overlay */}
                <div className="absolute inset-0 border-2 border-cyan-400/80 m-8 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                  <span className="text-[10px] font-bold text-cyan-300 bg-black/60 px-2 py-1 rounded">Visez le QR Code</span>
                </div>
              </div>
            )}

            {/* Scan Error Message */}
            {scanError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
                {scanError}
              </div>
            )}

            {/* Scan Result Container */}
            {scanResult && (
              <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 space-y-3 shadow-xl">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <Check className="w-4 h-4" />
                  <span>QR Code Décodé avec Succès !</span>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 break-all select-all">
                  {scanResult}
                </div>

                <div className="flex gap-2">
                  {scanResult.startsWith("http://") || scanResult.startsWith("https://") ? (
                    <a
                      href={scanResult}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ouvrir le Lien</span>
                    </a>
                  ) : null}

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(scanResult);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copié !" : "Copier le Contenu"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === "history" && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Historique Récent ({history.length})
              </span>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Effacer tout</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Aucun QR Code dans l'historique pour l'instant.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          item.type === "generated"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {item.type === "generated" ? <QrCode className="w-4 h-4" /> : <Scan className="w-4 h-4" />}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{item.label}</span>
                          <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{item.content}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.content);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/30 text-slate-300 hover:text-white transition-all text-xs"
                        title="Copier"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
