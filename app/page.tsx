"use client";

import React, { useRef, useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog } from "@headlessui/react";

export default function IDToPDF() {
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [side, setSide] = useState<"front" | "back" | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [openCropper, setOpenCropper] = useState(false);
  const [generating, setGenerating] = useState(false);
  const a4Ref = useRef<HTMLDivElement | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area, rotation = 0) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const radians = (rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    const newWidth = image.width * cos + image.height * sin;
    const newHeight = image.height * cos + image.width * sin;

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = newWidth;
    tmpCanvas.height = newHeight;
    const tmpCtx = tmpCanvas.getContext("2d")!;
    tmpCtx.translate(newWidth / 2, newHeight / 2);
    tmpCtx.rotate(radians);
    tmpCtx.drawImage(image, -image.width / 2, -image.height / 2);

    const data = tmpCtx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.putImageData(data, 0, 0);

    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setSide(type);
      setRotation(0);
      setOpenCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const cropped = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
    if (cropped) {
      if (side === "front") setFront(cropped);
      else setBack(cropped);
    }
    setOpenCropper(false);
  };

  async function generatePDF(preview = false) {
    if (!a4Ref.current) return;
    setGenerating(true);

    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const canvas = await html2canvas(a4Ref.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.8);
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);

    if (preview) {
      const blob = pdf.output("bloburl");
      window.open(blob, "_blank");
    } else {
      pdf.save("ID_Card.pdf");
    }

    setGenerating(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-3 sm:px-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl text-gray-700  font-semibold mb-3 sm:mb-4 text-center sm:text-left">
          🪪 ID to A4 PDF Generator by Vedant 
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 text-center sm:text-left">
          Upload front & back of your ID, crop and rotate them, then download as a clean A4 PDF.
        </p>

        {/* 🖼️ Upload Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[{ label: "Front", value: front, side: "front" }, { label: "Back", value: back, side: "back" }].map((item) => (
            <label
              key={item.side}
              className="flex flex-col items-center gap-2 p-3 border  rounded-lg cursor-pointer hover:bg-gray-50 transition"
            >
              <span className="text-sm font-medium">{item.label} Side</span>
              <div className="w-48 h-28 sm:w-56 sm:h-32 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                {item.value ? (
                  <img src={item.value} alt={item.label} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-400">Upload {item.label.toLowerCase()}</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, item.side as "front" | "back")}
                className="hidden"
              />
            </label>
          ))}
        </div>

        {/* ⚙️ Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-start">
          <button
            onClick={() => generatePDF(true)}
            disabled={!front && !back}
            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-md shadow disabled:opacity-50"
          >
            Preview PDF
          </button>

          <button
            onClick={() => generatePDF(false)}
            disabled={!front && !back}
            className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-md shadow disabled:opacity-50"
          >
            {generating ? "Generating…" : "Download PDF"}
          </button>

          <button
            onClick={() => {
              setFront(null);
              setBack(null);
            }}
            className="flex-1 sm:flex-none px-4 py-2 border rounded-md text-gray-800"
          >
            Reset
          </button>
        </div>

        {/* 🧾 Hidden A4 layout for PDF */}
        <div style={{ position: "absolute", left: -9999, top: -9999 }}>
          <div
            ref={a4Ref}
            style={{
              width: "210mm",
              height: "297mm",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "white",
            }}
          >
            {front && (
              <img
                src={front}
                alt="front"
                style={{
                  width: "60%",
                  height: "350px",
                  objectFit: "contain",
                  marginBottom: "40mm",
                }}
              />
            )}
            {back && (
              <img
                src={back}
                alt="back"
                style={{
                  width: "60%",
                  height: "350px",
                  objectFit: "contain",
                }}
              />
            )}
          </div>
        </div>

        {/* ✂️ Cropper Modal */}
        <Dialog
          open={openCropper}
          onClose={() => setOpenCropper(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-0"
        >
          <Dialog.Panel className="bg-white rounded-xl w-full max-w-md sm:max-w-lg p-3 sm:p-4">
            <h2 className="text-base sm:text-lg font-medium mb-2 text-center sm:text-left">
              Crop & Rotate {side} side
            </h2>
            <div className="relative w-full h-64 sm:h-80 bg-gray-200 rounded-lg overflow-hidden">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1.6}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>
            <div className="mt-4 flex flex-col sm:flex-row justify-between gap-3">
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md"
              >
                Rotate 90°
              </button>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setOpenCropper(false)}
                  className="px-4 py-2 border rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropSave}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md"
                >
                  Save Crop
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </Dialog>
      </div>
    </div>
  );
}
