
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
        // Ensure a consistent white background for the PDF regardless of theme
        backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const ratio = canvasWidth / canvasHeight;

    // A small margin
    const margin = 20;

    // Calculate image dimensions to fit within the page width with margins
    const imgWidth = pdfWidth - margin * 2;
    const imgHeight = imgWidth / ratio;

    // Check if the image height exceeds the page height with margins
    if (imgHeight > pdfHeight - margin * 2) {
      console.warn("PDF content might overflow the page. The form is taller than a single A4 page.");
    }

    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    pdf.save(`${fileName}.pdf`);

  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
    throw new Error("Falha ao gerar o PDF.");
  }
};