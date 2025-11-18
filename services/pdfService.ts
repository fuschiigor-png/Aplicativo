
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const generateOrderPdf = async (elementId: string, fileName: string): Promise<void> => {
  const input = document.getElementById(elementId);
  if (!input) {
    console.error(`Element with id ${elementId} not found.`);
    alert(`Erro: Elemento do formulário não encontrado para gerar o PDF.`);
    return;
  }

  // Salvar o estado atual do tema (Dark Mode)
  const htmlElement = document.documentElement;
  const isDarkMode = htmlElement.classList.contains('dark');

  // Salvar estilos originais do elemento para restaurar depois
  const originalStyleWidth = input.style.width;
  const originalStyleMaxWidth = input.style.maxWidth;
  const originalStyleTransform = input.style.transform;

  try {
    // 1. FORÇAR MODO CLARO: Remove a classe dark temporariamente
    if (isDarkMode) {
        htmlElement.classList.remove('dark');
    }

    // 2. FORÇAR LAYOUT DESKTOP: Define uma largura fixa larga para garantir que
    // o grid do Tailwind (md:grid-cols-X) seja respeitado e não fique empilhado como no mobile.
    input.style.width = '1120px'; 
    input.style.maxWidth = 'none';
    
    // Pequeno delay para garantir que o navegador renderize a mudança de tema/tamanho
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(input, {
        scale: 2, // Alta resolução
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff', // Força fundo branco
        windowWidth: 1200, // Simula uma tela grande para breakpoints do CSS
        windowHeight: input.scrollHeight // Garante captura total da altura
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

    // Margem pequena
    const margin = 20;

    // Calcula dimensões para caber na largura A4 mantendo proporção
    const imgWidth = pdfWidth - margin * 2;
    const imgHeight = imgWidth / ratio;

    // Se a imagem for maior que uma página, avisa (ou poderia implementar paginação futura)
    if (imgHeight > pdfHeight - margin * 2) {
      console.warn("PDF content might overflow the page.");
    }

    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    pdf.save(`${fileName}.pdf`);

  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Ocorreu um erro ao gerar o PDF. Tente recarregar a página.");
  } finally {
    // 3. RESTAURAR ESTADO ORIGINAL
    // Devolve o modo escuro se estava ativado
    if (isDarkMode) {
        htmlElement.classList.add('dark');
    }
    // Devolve o tamanho original do elemento na tela
    input.style.width = originalStyleWidth;
    input.style.maxWidth = originalStyleMaxWidth;
    input.style.transform = originalStyleTransform;
  }
};
