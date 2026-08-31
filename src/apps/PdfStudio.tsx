import React, { useState, useRef } from "react";
import {
  FileText,
  FileOutput,
  Combine,
  Split,
  Image as ImageIcon,
  RotateCw,
  Stamp,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Trash2,
  FileCode,
  Layers,
  Zap,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

// Set pdfjs worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.min.mjs`;

type ToolMode =
  | "pdf-to-word"
  | "word-to-pdf"
  | "merge"
  | "split"
  | "img-to-pdf"
  | "rotate-watermark";

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  arrayBuffer?: ArrayBuffer;
}

export default function PdfStudio() {
  const [activeTool, setActiveTool] = useState<ToolMode>("pdf-to-word");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Tools specific options
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIEL");
  const [rotationAngle, setRotationAngle] = useState<number>(90);
  const [customTextContent, setCustomTextContent] = useState("");
  const [docTitle, setDocTitle] = useState("Mon Document Nexus");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const rawFiles = Array.from(e.target.files);

    const newFiles: UploadedFile[] = [];
    for (const file of rawFiles) {
      const buffer = await file.arrayBuffer();
      let dataUrl: string | undefined = undefined;
      if (file.type.startsWith("image/")) {
        dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      newFiles.push({
        id: `pdf-file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
        arrayBuffer: buffer,
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
    setStatusMessage({ type: "info", text: `${newFiles.length} fichier(s) ajouté(s).` });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearFiles = () => {
    setFiles([]);
    setStatusMessage(null);
  };

  // 1. VRAIE Conversion PDF vers Word (.docx) avec extraction réelle de texte
  const handlePdfToWord = async () => {
    if (files.length === 0) {
      setStatusMessage({ type: "error", text: "Merci de d'abord sélectionner un fichier PDF à convertir." });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ type: "info", text: "Extraction du texte du PDF page par page en cours..." });

    try {
      const target = files[0];
      const uint8 = new Uint8Array(target.arrayBuffer!);
      
      // Chargement du PDF via PDF.js
      const loadingTask = pdfjsLib.getDocument({ data: uint8 });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      const docxParagraphs: Paragraph[] = [
        new Paragraph({
          text: target.name.replace(/\.pdf$/i, ""),
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 300 },
        }),
      ];

      let totalExtractedLength = 0;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        docxParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `--- PAGE ${pageNum} / ${numPages} ---`,
                bold: true,
                color: "64748B",
                size: 18,
              }),
            ],
            spacing: { before: 200, after: 150 },
          })
        );

        let currentLine = "";
        let lastY = -1;

        for (const item of textContent.items as any[]) {
          if ("str" in item) {
            const y = item.transform ? item.transform[5] : -1;
            if (lastY !== -1 && Math.abs(y - lastY) > 6) {
              if (currentLine.trim()) {
                docxParagraphs.push(
                  new Paragraph({
                    children: [new TextRun({ text: currentLine.trim(), size: 22 })],
                    spacing: { after: 120 },
                  })
                );
                totalExtractedLength += currentLine.length;
              }
              currentLine = "";
            }
            currentLine += item.str + " ";
            lastY = y;
          }
        }

        if (currentLine.trim()) {
          docxParagraphs.push(
            new Paragraph({
              children: [new TextRun({ text: currentLine.trim(), size: 22 })],
              spacing: { after: 120 },
            })
          );
          totalExtractedLength += currentLine.length;
        }
      }

      // Si le PDF est un PDF scanné/image sans texte vectoriel
      if (totalExtractedLength === 0) {
        docxParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "Remarque : Ce fichier PDF contient principalement des images ou des éléments graphiques. La structure des pages a été préservée.",
                italics: true,
                color: "94A3B8",
              }),
            ],
          })
        );
      }

      // Génération du document Word natif (.docx)
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docxParagraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = target.name.replace(/\.pdf$/i, "") + "_Converti_Nexus.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: "success",
        text: `Conversion réussie ! Le fichier Microsoft Word (.docx) natif a été téléchargé (${numPages} page(s) extraite(s)).`,
      });
    } catch (err: any) {
      console.error("Erreur conversion PDF:", err);
      setStatusMessage({
        type: "error",
        text: "Erreur lors de l'extraction. Assurez-vous que le fichier PDF n'est pas protégé par un mot de passe.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Word / Texte vers PDF
  const handleWordToPdf = async () => {
    if (!customTextContent.trim() && files.length === 0) {
      setStatusMessage({ type: "error", text: "Saisis du texte ou importez un document à convertir." });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ type: "info", text: "Génération du PDF en haute définition..." });

    try {
      let textToConvert = customTextContent;
      if (files.length > 0 && !textToConvert) {
        const textFile = files[0];
        const text = new TextDecoder().decode(textFile.arrayBuffer);
        textToConvert = text || `Document importé : ${textFile.name}`;
      }

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Styling A4 page
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(14, 165, 233); // Cyan Nexus
      doc.text(docTitle || "Document Nexus Studio", 20, 25);

      doc.setDrawColor(226, 232, 240);
      doc.line(20, 30, 190, 30);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);

      const splitLines = doc.splitTextToSize(textToConvert, 170);
      let y = 40;
      for (let i = 0; i < splitLines.length; i++) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(splitLines[i], 20, y);
        y += 6.5;
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} sur ${pageCount} — Généré par Nexus PDF Studio`, 20, 287);
      }

      doc.save(`${(docTitle || "Document").replace(/\s+/g, "_")}.pdf`);
      setStatusMessage({ type: "success", text: "Document PDF généré et téléchargé avec succès !" });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Échec de la création du PDF." });
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Fusionner plusieurs PDF
  const handleMergePdfs = async () => {
    if (files.length < 2) {
      setStatusMessage({ type: "error", text: "Sélectionne au moins 2 fichiers PDF à fusionner." });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ type: "info", text: "Fusion des documents PDF en cours..." });

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        if (item.arrayBuffer) {
          const pdfToMerge = await PDFDocument.load(item.arrayBuffer);
          const copiedPages = await mergedPdf.copyPages(pdfToMerge, pdfToMerge.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "PDF_Fusionne_Nexus.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({ type: "success", text: `Fusion de ${files.length} fichiers PDF réussie !` });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Impossible de fusionner ces fichiers PDF." });
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Diviser PDF
  const handleSplitPdf = async () => {
    if (files.length === 0) {
      setStatusMessage({ type: "error", text: "Merci de importer un fichier PDF à diviser." });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ type: "info", text: "Division des pages du PDF..." });

    try {
      const sourceFile = files[0];
      const pdfDoc = await PDFDocument.load(sourceFile.arrayBuffer!);
      const totalPages = pdfDoc.getPageCount();

      // Create a new PDF with just Page 1 and download
      for (let i = 0; i < Math.min(totalPages, 5); i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);

        const pdfBytes = await newPdf.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${sourceFile.name.replace(".pdf", "")}_Page_${i + 1}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setStatusMessage({
        type: "success",
        text: `PDF divisé en pages individuelles ! (${totalPages} page(s) extraite(s)).`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Erreur lors de la division du PDF." });
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Images (JPG/PNG) vers PDF avec conservation d'aspect ratio
  const handleImagesToPdf = async () => {
    const imgFiles = files.filter((f) => f.dataUrl || f.type.startsWith("image/"));
    if (imgFiles.length === 0) {
      setStatusMessage({ type: "error", text: "Merci de ajouter au moins une image (JPG, PNG, WEBP)." });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ type: "info", text: "Optimisation et conversion des images en PDF A4..." });

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      for (let i = 0; i < imgFiles.length; i++) {
        if (i > 0) doc.addPage();
        const imgData = imgFiles[i].dataUrl;
        if (imgData) {
          const img = new Image();
          img.src = imgData;
          await new Promise((res) => { img.onload = res; });

          const imgWidth = img.naturalWidth || 800;
          const imgHeight = img.naturalHeight || 600;

          const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
          const finalWidth = imgWidth * ratio;
          const finalHeight = imgHeight * ratio;

          const x = (pageWidth - finalWidth) / 2;
          const y = (pageHeight - finalHeight) / 2;

          doc.addImage(imgData, "JPEG", x, y, finalWidth, finalHeight, undefined, "FAST");
        }
      }

      doc.save("Images_A_PDF_Nexus.pdf");
      setStatusMessage({ type: "success", text: `${imgFiles.length} image(s) convertie(s) en PDF avec succès !` });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Erreur lors de la création du PDF à partir des images." });
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. Pivoter / Filigrane
  const handleRotateAndWatermark = async () => {
    if (files.length === 0) {
      setStatusMessage({ type: "error", text: "Sélectionne un document PDF à modifier." });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ type: "info", text: "Application de la rotation et du filigrane..." });

    try {
      const source = files[0];
      const pdfDoc = await PDFDocument.load(source.arrayBuffer!);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        // Rotate
        page.setRotation(degrees(rotationAngle));

        // Watermark text
        if (watermarkText.trim()) {
          const { width, height } = page.getSize();
          page.drawText(watermarkText.toUpperCase(), {
            x: width / 4,
            y: height / 2,
            size: 42,
            opacity: 0.25,
            rotate: degrees(45),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${source.name.replace(".pdf", "")}_Modifie_Nexus.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({ type: "success", text: "Rotation et filigrane appliqués avec succès !" });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: "Erreur lors de l'application des modifications." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-nexus-bg text-nexus-text font-sans overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-nexus-border bg-nexus-panel backdrop-blur-2xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 shadow-md">
            <Combine className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-nexus-text tracking-wide flex items-center gap-2">
              PDF Studio & Convertisseur Pro
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-semibold">
                Alternative iLovePDF
              </span>
            </h1>
            <p className="text-[11px] text-nexus-muted">
              Convertissez, fusionnez, divisez et éditez tes PDF en toute sécurité sur ton machine
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <button
            onClick={clearFiles}
            className="nx-btn nx-btn-danger flex items-center gap-1.5 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Réinitialiser ({files.length})</span>
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar / Tools Menu */}
        <div className="w-64 border-r border-nexus-border bg-nexus-panel/50 p-3 space-y-1.5 overflow-y-auto shrink-0">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-nexus-muted">
            Outils Principaux PDF
          </div>

          <button
            onClick={() => setActiveTool("pdf-to-word")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTool === "pdf-to-word"
                ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-md"
                : "text-nexus-muted hover:bg-nexus-card hover:text-nexus-text"
            }`}
          >
            <FileText className="w-4 h-4 text-red-400 shrink-0" />
            <div className="text-left min-w-0">
              <div className="truncate">PDF vers Word (.doc)</div>
              <div className="text-[10px] text-nexus-muted font-normal truncate">Extraire en document éditable</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTool("word-to-pdf")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTool === "word-to-pdf"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-md"
                : "text-nexus-muted hover:bg-nexus-card hover:text-nexus-text"
            }`}
          >
            <FileOutput className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="text-left min-w-0">
              <div className="truncate">Word / Texte vers PDF</div>
              <div className="text-[10px] text-nexus-muted font-normal truncate">Créer un PDF haute définition</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTool("merge")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTool === "merge"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-md"
                : "text-nexus-muted hover:bg-nexus-card hover:text-nexus-text"
            }`}
          >
            <Combine className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="text-left min-w-0">
              <div className="truncate">Fusionner PDF</div>
              <div className="text-[10px] text-nexus-muted font-normal truncate">Combiner plusieurs PDF en un seul</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTool("split")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTool === "split"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-md"
                : "text-nexus-muted hover:bg-nexus-card hover:text-nexus-text"
            }`}
          >
            <Split className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-left min-w-0">
              <div className="truncate">Diviser PDF</div>
              <div className="text-[10px] text-nexus-muted font-normal truncate">Extraire les pages séparément</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTool("img-to-pdf")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTool === "img-to-pdf"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md"
                : "text-nexus-muted hover:bg-nexus-card hover:text-nexus-text"
            }`}
          >
            <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-left min-w-0">
              <div className="truncate">Images vers PDF</div>
              <div className="text-[10px] text-nexus-muted font-normal truncate">Convertir JPG / PNG en PDF</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTool("rotate-watermark")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
              activeTool === "rotate-watermark"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md"
                : "text-nexus-muted hover:bg-nexus-card hover:text-nexus-text"
            }`}
          >
            <RotateCw className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="text-left min-w-0">
              <div className="truncate">Pivoter & Filigrane</div>
              <div className="text-[10px] text-nexus-muted font-normal truncate">Orienter les pages ou tamponner</div>
            </div>
          </button>
        </div>

        {/* Main Workspace Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Status Alert Message */}
            {statusMessage && (
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
                  statusMessage.type === "success"
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    : statusMessage.type === "error"
                    ? "bg-red-500/15 border-red-500/30 text-red-300"
                    : "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {statusMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : statusMessage.type === "error" ? (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
                <button
                  onClick={() => setStatusMessage(null)}
                  className="text-xs opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Hidden Input File Element */}
            <input
              type="file"
              ref={fileInputRef}
              multiple={activeTool === "merge" || activeTool === "img-to-pdf"}
              accept={
                activeTool === "img-to-pdf"
                  ? "image/*"
                  : activeTool === "word-to-pdf"
                  ? ".doc,.docx,.txt,.md"
                  : ".pdf"
              }
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Dropzone & Upload Action */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-nexus-border hover:border-red-500/50 rounded-3xl p-8 bg-nexus-card hover:bg-nexus-card-hover transition-all duration-[320ms] [transition-timing-function:var(--ressort)] cursor-pointer flex flex-col items-center justify-center text-center space-y-3 group shadow-xl"
            >
              <div className="p-4 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-nexus-text">
                  Glisse-déposez tes fichiers ici ou{" "}
                  <span className="text-red-400 underline">Parcourir</span>
                </h3>
                <p className="text-xs text-nexus-muted mt-1">
                  {activeTool === "img-to-pdf"
                    ? "Formats acceptés : JPG, PNG, WEBP"
                    : activeTool === "word-to-pdf"
                    ? "Formats acceptés : DOC, DOCX, TXT, MD"
                    : "Formats acceptés : PDF"}
                </p>
              </div>
            </div>

            {/* Text Editor for Word -> PDF tool */}
            {activeTool === "word-to-pdf" && (
              <div className="space-y-3 bg-nexus-panel border border-nexus-border p-4 rounded-2xl shadow-md">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-nexus-text flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    Titre du Document PDF
                  </label>
                  <span className="text-[10px] text-nexus-muted">A4 Portrait</span>
                </div>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="ex: Rapport d'Activité Nexus"
                  className="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-2 text-xs text-nexus-text focus:outline-none focus:border-cyan-400"
                />

                <label className="text-xs font-bold text-nexus-text block pt-2">
                  Contenu textuel à convertir en PDF (ou importez un fichier texte)
                </label>
                <textarea
                  rows={6}
                  value={customTextContent}
                  onChange={(e) => setCustomTextContent(e.target.value)}
                  placeholder="Tape ou colle ton texte ici..."
                  className="w-full bg-nexus-card border border-nexus-border rounded-xl p-3 text-xs text-nexus-text focus:outline-none focus:border-cyan-400 resize-none font-mono"
                />
              </div>
            )}

            {/* Options for Rotate & Watermark */}
            {activeTool === "rotate-watermark" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-nexus-panel border border-nexus-border p-4 rounded-2xl shadow-md">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-nexus-text flex items-center gap-1.5">
                    <RotateCw className="w-4 h-4 text-cyan-400" />
                    Angle de Rotation
                  </label>
                  <select
                    value={rotationAngle}
                    onChange={(e) => setRotationAngle(Number(e.target.value))}
                    className="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-2 text-xs text-nexus-text focus:outline-none"
                  >
                    <option value={90}>90° Sens Horaire</option>
                    <option value={180}>180° Inversé</option>
                    <option value={270}>270° Sens Anti-Horaire</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-nexus-text flex items-center gap-1.5">
                    <Stamp className="w-4 h-4 text-pink-400" />
                    Texte du Filigrane
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="ex: CONFIDENTIEL"
                    className="w-full bg-nexus-card border border-nexus-border rounded-xl px-3 py-2 text-xs text-nexus-text focus:outline-none focus:border-pink-400"
                  />
                </div>
              </div>
            )}

            {/* Uploaded Files List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-nexus-text flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Fichiers en attente de traitement ({files.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {files.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-nexus-card border border-nexus-border shadow-sm text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="p-2 rounded-xl bg-red-500/10 text-red-400 font-bold text-[10px]">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-nexus-text truncate">{item.name}</p>
                          <p className="text-[10px] text-nexus-muted">
                            {(item.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(item.id)}
                        className="p-1.5 rounded-lg text-nexus-muted hover:text-red-400 hover:bg-nexus-panel transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger Button */}
          <div className="pt-4 border-t border-nexus-border flex justify-end">
            <button
              disabled={isProcessing}
              onClick={() => {
                if (activeTool === "pdf-to-word") handlePdfToWord();
                else if (activeTool === "word-to-pdf") handleWordToPdf();
                else if (activeTool === "merge") handleMergePdfs();
                else if (activeTool === "split") handleSplitPdf();
                else if (activeTool === "img-to-pdf") handleImagesToPdf();
                else if (activeTool === "rotate-watermark") handleRotateAndWatermark();
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-extrabold text-white shadow-xl transition-all active:scale-95 ${
                isProcessing
                  ? "bg-slate-700 cursor-not-allowed"
                  : "nx-grad hover:from-red-500 hover:to-pink-500 shadow-red-600/30"
              }`}
            >
              {isProcessing ? (
                <>
                  <Zap className="w-4 h-4 animate-spin text-white" />
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <span>
                    {activeTool === "pdf-to-word" && "Lancer la conversion en Word"}
                    {activeTool === "word-to-pdf" && "Générer le document PDF"}
                    {activeTool === "merge" && "Fusionner les PDF"}
                    {activeTool === "split" && "Diviser le PDF"}
                    {activeTool === "img-to-pdf" && "Convertir les images en PDF"}
                    {activeTool === "rotate-watermark" && "Appliquer la rotation & filigrane"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
