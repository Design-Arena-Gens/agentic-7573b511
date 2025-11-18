'use client';

import { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export default function Home() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageTime, setPageTime] = useState(2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file');
      return;
    }

    setPdfFile(file);
    setVideoUrl(null);
    setPages([]);
    setCurrentPage(0);
    setProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageImages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          pageImages.push(canvas.toDataURL('image/png'));
        }
      }

      setPages(pageImages);
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert('Error processing PDF file');
    } finally {
      setProcessing(false);
    }
  };

  const startRecording = async () => {
    if (!canvasRef.current || pages.length === 0) return;

    setRecording(true);
    setCurrentPage(0);
    chunksRef.current = [];

    const stream = canvasRef.current.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
    });

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setRecording(false);
    };

    mediaRecorder.start();

    // Animate through pages
    for (let i = 0; i < pages.length; i++) {
      setCurrentPage(i);
      await new Promise(resolve => setTimeout(resolve, pageTime * 1000));
    }

    mediaRecorder.stop();
  };

  useEffect(() => {
    if (canvasRef.current && pages.length > 0 && currentPage < pages.length) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
      };

      img.src = pages[currentPage];
    }
  }, [currentPage, pages]);

  const downloadVideo = () => {
    if (!videoUrl) return;

    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${pdfFile?.name.replace('.pdf', '')}_video.webm`;
    a.click();
  };

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <h1 style={styles.title}>PDF to Video Converter</h1>
        <p style={styles.subtitle}>Upload a PDF and convert it to a video showing pages one by one</p>

        <div style={styles.uploadSection}>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            style={styles.fileInput}
            id="file-upload"
            disabled={processing || recording}
          />
          <label htmlFor="file-upload" style={styles.uploadButton}>
            {pdfFile ? `📄 ${pdfFile.name}` : '📁 Choose PDF File'}
          </label>
        </div>

        {processing && (
          <div style={styles.status}>
            <div style={styles.spinner}></div>
            <p>Processing PDF...</p>
          </div>
        )}

        {pages.length > 0 && !recording && (
          <div style={styles.controls}>
            <div style={styles.controlGroup}>
              <label style={styles.label}>
                Seconds per page:
                <input
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={pageTime}
                  onChange={(e) => setPageTime(parseFloat(e.target.value))}
                  style={styles.numberInput}
                />
              </label>
            </div>
            <button onClick={startRecording} style={styles.recordButton}>
              🎥 Create Video ({pages.length} pages)
            </button>
          </div>
        )}

        {recording && (
          <div style={styles.status}>
            <div style={styles.spinner}></div>
            <p>Recording video... Page {currentPage + 1} of {pages.length}</p>
          </div>
        )}

        {pages.length > 0 && (
          <div style={styles.previewSection}>
            <h3 style={styles.previewTitle}>Preview:</h3>
            <canvas ref={canvasRef} style={styles.canvas} />
          </div>
        )}

        {videoUrl && (
          <div style={styles.videoSection}>
            <h3 style={styles.previewTitle}>Generated Video:</h3>
            <video src={videoUrl} controls style={styles.video} />
            <button onClick={downloadVideo} style={styles.downloadButton}>
              ⬇️ Download Video
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  main: {
    minHeight: '100vh',
    padding: '2rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    maxWidth: '900px',
    width: '100%',
    background: 'white',
    borderRadius: '20px',
    padding: '3rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '0.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '2rem',
    fontSize: '1.1rem',
  },
  uploadSection: {
    marginBottom: '2rem',
    textAlign: 'center',
  },
  fileInput: {
    display: 'none',
  },
  uploadButton: {
    display: 'inline-block',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '1.1rem',
    fontWeight: '600',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  controls: {
    marginBottom: '2rem',
    padding: '1.5rem',
    background: '#f8f9fa',
    borderRadius: '10px',
  },
  controlGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '1rem',
    fontWeight: '500',
  },
  numberInput: {
    padding: '0.5rem',
    borderRadius: '5px',
    border: '2px solid #ddd',
    fontSize: '1rem',
    width: '100px',
  },
  recordButton: {
    width: '100%',
    padding: '1rem',
    background: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  status: {
    textAlign: 'center',
    padding: '2rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem',
  },
  previewSection: {
    marginTop: '2rem',
  },
  previewTitle: {
    fontSize: '1.5rem',
    marginBottom: '1rem',
    color: '#333',
  },
  canvas: {
    maxWidth: '100%',
    height: 'auto',
    border: '2px solid #ddd',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  videoSection: {
    marginTop: '2rem',
  },
  video: {
    width: '100%',
    borderRadius: '10px',
    marginBottom: '1rem',
  },
  downloadButton: {
    width: '100%',
    padding: '1rem',
    background: '#51cf66',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
