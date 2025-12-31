import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { processText } from './textProcessor';

// --- HELPERS ---

// Parse numbering.xml to map numId -> abstractNumId -> level -> bullet char
const parseNumbering = (numberingXmlStr: string) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(numberingXmlStr, "text/xml");
  
  // Map numId -> abstractNumId
  const numToAbstract = new Map<string, string>();
  const nums = xmlDoc.getElementsByTagName("w:num");
  for (let i = 0; i < nums.length; i++) {
    const numId = nums[i].getAttribute("w:numId");
    const abstractNumId = nums[i].getElementsByTagName("w:abstractNumId")[0]?.getAttribute("w:val");
    if (numId && abstractNumId) {
      numToAbstract.set(numId, abstractNumId);
    }
  }

  // Map abstractNumId -> level -> text/format
  const abstractLevels = new Map<string, Map<string, string>>();
  const abstractNums = xmlDoc.getElementsByTagName("w:abstractNum");
  
  for (let i = 0; i < abstractNums.length; i++) {
    const absId = abstractNums[i].getAttribute("w:abstractNumId");
    if (!absId) continue;

    const levels = new Map<string, string>();
    const lvls = abstractNums[i].getElementsByTagName("w:lvl");
    
    for (let j = 0; j < lvls.length; j++) {
      const ilvl = lvls[j].getAttribute("w:ilvl");
      const lvlText = lvls[j].getElementsByTagName("w:lvlText")[0]?.getAttribute("w:val");
      const numFmt = lvls[j].getElementsByTagName("w:numFmt")[0]?.getAttribute("w:val");
      
      if (ilvl && lvlText) {
        if (numFmt === 'bullet') {
           levels.set(ilvl, lvlText);
        } else {
           levels.set(ilvl, lvlText.replace(/%\d/g, '1')); 
        }
      }
    }
    abstractLevels.set(absId, levels);
  }

  return { numToAbstract, abstractLevels };
};

// --- DOCX MODIFICATION (Existing) ---

export const handleDocxUpload = async (file: File): Promise<{ text: string; originalBuffer: ArrayBuffer }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        // Load document
        const docXml = await zip.file("word/document.xml")?.async("string");
        if (!docXml) throw new Error("Invalid DOCX file");

        // Load numbering if exists
        const numberingXml = await zip.file("word/numbering.xml")?.async("string");
        let numberingMap = null;
        if (numberingXml) {
            numberingMap = parseNumbering(numberingXml);
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(docXml, "text/xml");
        const paragraphs = xmlDoc.getElementsByTagName("w:p");
        
        let extractedText = "";
        
        for (let i = 0; i < paragraphs.length; i++) {
          const p = paragraphs[i];
          let pText = p.textContent || "";
          
          // Check for numbering/bullets
          const numPr = p.getElementsByTagName("w:numPr")[0];
          if (numPr && numberingMap) {
            const numId = numPr.getElementsByTagName("w:numId")[0]?.getAttribute("w:val");
            const ilvl = numPr.getElementsByTagName("w:ilvl")[0]?.getAttribute("w:val") || "0";
            
            if (numId) {
                const abstractId = numberingMap.numToAbstract.get(numId);
                if (abstractId) {
                    const bulletChar = numberingMap.abstractLevels.get(abstractId)?.get(ilvl);
                    if (bulletChar) {
                        // Prepend bullet to text
                        pText = `${bulletChar} ${pText}`;
                    }
                }
            }
          }

          extractedText += pText + "\n";
        }

        resolve({ text: extractedText, originalBuffer: arrayBuffer });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const processAndDownloadDocx = async (originalBuffer: ArrayBuffer, fileName: string) => {
  try {
    const zip = await JSZip.loadAsync(originalBuffer);
    
    // 1. Load Numbering Map
    const numberingXml = await zip.file("word/numbering.xml")?.async("string");
    let numberingMap = null;
    if (numberingXml) {
        numberingMap = parseNumbering(numberingXml);
    }

    const docFile = zip.file("word/document.xml");
    if (!docFile) throw new Error("Document XML not found");
    
    const docXmlStr = await docFile.async("string");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(docXmlStr, "text/xml");
    
    const paragraphs = xmlDoc.getElementsByTagName("w:p");
    
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      
      const runs = p.getElementsByTagName("w:r");
      if (runs.length === 0) continue;
      
      // Collect all text nodes and build full text to preserve formatting logic
      const textNodes: Element[] = [];
      let fullText = "";
      
      for (let j = 0; j < runs.length; j++) {
         const tNodes = runs[j].getElementsByTagName("w:t");
         for (let k = 0; k < tNodes.length; k++) {
             textNodes.push(tNodes[k]);
             fullText += tNodes[k].textContent || "";
         }
      }
      
      if (textNodes.length === 0) continue;
      // Skip empty lines processing to avoid side effects, unless it has a bullet?
      // But if fullText is empty, bullet logic might still apply if we want to add content? 
      // Unlikely for this app.
      if (!fullText.trim()) continue;

      // Identify if there is a bullet hidden in numPr
      let bulletPrefix = "";
      const numPr = p.getElementsByTagName("w:numPr")[0];
      if (numPr && numberingMap) {
        const numId = numPr.getElementsByTagName("w:numId")[0]?.getAttribute("w:val");
        const ilvl = numPr.getElementsByTagName("w:ilvl")[0]?.getAttribute("w:val") || "0";
        if (numId) {
            const abstractId = numberingMap.numToAbstract.get(numId);
            if (abstractId) {
                const bChar = numberingMap.abstractLevels.get(abstractId)?.get(ilvl);
                if (bChar) {
                    bulletPrefix = bChar + " ";
                }
            }
        }
      }

      // Process the text with the bullet
      const textToProcess = bulletPrefix + fullText;
      const processedText = processText(textToProcess);
      
      // If we flattened a bullet (converted to text), remove the XML numbering definition
      // so we don't have double bullets.
      if (bulletPrefix && /^([-+*•]|\+\))/.test(processedText.trim())) {
          if (numPr && numPr.parentNode) {
              numPr.parentNode.removeChild(numPr);
          }
      }

      // Distribute text back to nodes to preserve formatting (Bold/Italic/Color)
      // Strategy: Sequential fill with offset compensation for added bullet.
      let currentIndex = 0;
      const lengthDiff = processedText.length - fullText.length;
      
      for (let k = 0; k < textNodes.length; k++) {
          const originalContent = textNodes[k].textContent || "";
          let targetLength = originalContent.length;
          
          // If this is the first node and we added a bullet (length increased),
          // add the diff to the first node's quota so the text content alignment shifts naturally.
          if (k === 0 && lengthDiff > 0) {
              targetLength += lengthDiff;
          }

          let sliceEnd = currentIndex + targetLength;
          
          if (k === textNodes.length - 1) {
              // Last node takes the rest
              textNodes[k].textContent = processedText.slice(currentIndex);
          } else {
              if (currentIndex >= processedText.length) {
                  textNodes[k].textContent = "";
              } else {
                  textNodes[k].textContent = processedText.slice(currentIndex, sliceEnd);
              }
          }
          
          currentIndex = sliceEnd;
      }
    }

    const serializer = new XMLSerializer();
    const newDocXmlStr = serializer.serializeToString(xmlDoc);
    
    zip.file("word/document.xml", newDocXmlStr);
    
    const blob = await zip.generateAsync({ type: "blob" });
    const newFileName = fileName.replace(".docx", "_fixed.docx");
    
    // @ts-ignore
    const saveAs = FileSaver.saveAs || FileSaver;
    saveAs(blob, newFileName);
    
    return true;
  } catch (error) {
    console.error("Error processing DOCX:", error);
    throw error;
  }
};

// --- NEW DOCX GENERATION (From Text/PDF Source) ---

const escapeXml = (unsafe: string) => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

export const createAndDownloadDocxFromText = async (text: string, baseFileName: string) => {
  try {
    const zip = new JSZip();

    // 1. [Content_Types].xml
    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    // 2. _rels/.rels
    zip.folder("_rels")?.file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    // 3. word/document.xml
    // Convert text lines to paragraphs
    const lines = text.split('\n');
    let documentXmlBody = '';

    lines.forEach(line => {
        // Handle bold if line looks like a title (uppercase rule from processor)
        const isTitle = /^[A-ZÀ-Ỹ\s]{5,}$/.test(line.trim());
        const boldTag = isTitle ? '<w:b/>' : '';
        
        documentXmlBody += `
        <w:p>
            <w:pPr>
               ${boldTag}
            </w:pPr>
            <w:r>
                <w:rPr>
                    ${boldTag}
                    <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
                </w:rPr>
                <w:t>${escapeXml(line)}</w:t>
            </w:r>
        </w:p>`;
    });

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${documentXmlBody}
  </w:body>
</w:document>`;

    zip.folder("word")?.file("document.xml", documentXml);

    // Generate and Download
    const blob = await zip.generateAsync({ type: "blob" });
    const newFileName = baseFileName.replace(/\.(pdf|txt)/i, "") + "_fixed.docx";

    // @ts-ignore
    const saveAs = FileSaver.saveAs || FileSaver;
    saveAs(blob, newFileName);

    return true;
  } catch (error) {
    console.error("Error creating DOCX:", error);
    throw error;
  }
};