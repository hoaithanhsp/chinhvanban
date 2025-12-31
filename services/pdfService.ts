import * as pdfjsLib from 'pdfjs-dist';

// Handle esm.sh export structure where the library might be on .default or the module itself
// @ts-ignore
const pdfjs = pdfjsLib.default || pdfjsLib;

// Thiết lập worker cho pdfjs
// Sử dụng CDNJS cho worker script để đảm bảo tương thích với importScripts trong môi trường worker
// Version phải khớp với version trong importmap (3.11.174)
// @ts-ignore
if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export const handlePdfUpload = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
        
        // Use getDocument from the resolved pdfjs object
        const loadingTask = pdfjs.getDocument(typedarray);
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          let lastY = -1;
          let pageText = '';

          // @ts-ignore
          for (const item of textContent.items) {
             if ('transform' in item) {
                 const currentY = item.transform[5];
                 if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
                     pageText += '\n';
                 }
                 lastY = currentY;
             }
             // @ts-ignore
             pageText += item.str + ' ';
          }
          
          fullText += pageText + '\n\n';
        }

        resolve(fullText);
      } catch (err) {
        console.error("PDF Process Error: ", err);
        reject(err);
      }
    };
    
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};