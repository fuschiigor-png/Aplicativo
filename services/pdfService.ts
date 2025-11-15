import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generateOrderPdf = async (elementId: string, fileName: string): Promise<void> => {
  const input = document.getElementById(elementId);
  if (!input) {
    console.error(`Element with id ${elementId} not found.`);
    alert(`Erro: Elemento do formulário não encontrado para gerar o PDF.`);
    return;
  }

  try {
    const canvas = await html2canvas(input, { 
        scale: 2, // Higher scale for better quality
        useCORS: true, 
        logging: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#f9fafb' // Match theme bg
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    // A4 size in points: 595.28w x 841.89h
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4'
    });
    
    const margin = 28.35; // 1 cm in points (1cm = 28.35pt)
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2; // Usable height per page
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    const ratio = canvasHeight / canvasWidth;
    const totalPdfHeight = contentWidth * ratio; // Total height of the content when scaled
    
    let heightLeft = totalPdfHeight;
    let position = 0; // This is the y-offset for the source image

    // Add the first page
    pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, totalPdfHeight);
    heightLeft -= contentHeight;

    // Add new pages if content is taller than one page
    while (heightLeft > 0) {
      position -= contentHeight; 
      pdf.addPage();
      // Re-add the same image, but with a new y-offset to show the next part
      pdf.addImage(imgData, 'PNG', margin, position + margin, contentWidth, totalPdfHeight);
      heightLeft -= contentHeight;
    }
    
    pdf.save(`${fileName}.pdf`);

  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
    throw new Error("Falha ao gerar o PDF.");
  }
};
