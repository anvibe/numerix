import { GeneratedCombination } from '../types';
import { getGameByType } from './generators';

// Export to CSV (no external dependencies needed)
export const exportToCSV = (combinations: GeneratedCombination[]): void => {
  // Create CSV headers
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "ID,Gioco,Numeri,Data,Strategia\n";
  
  // Add each combination
  combinations.forEach(combo => {
    const row = [
      combo.id,
      getGameByType(combo.gameType).name,
      combo.numbers.join(' '),
      combo.date,
      combo.strategy === 'standard' ? 'Standard' : 'Alta Variabilità'
    ].join(',');
    
    csvContent += row + "\n";
  });
  
  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `numerix_combinazioni_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  
  // Trigger download and cleanup
  link.click();
  document.body.removeChild(link);
};

// Export to PDF - dynamically imports jsPDF to reduce initial bundle size
export const exportToPDF = async (combinations: GeneratedCombination[]): Promise<void> => {
  // Dynamic import for code splitting - jsPDF is only loaded when user exports
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text("Numerix - Combinazioni Generate", 15, 15);
  
  // Date
  doc.setFontSize(12);
  doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}`, 15, 25);
  
  let yPos = 35;
  
  // Add each combination
  combinations.forEach((combo, index) => {
    const game = getGameByType(combo.gameType);
    
    // Check if we need a new page
    if (yPos > 270) {
      doc.addPage();
      yPos = 15;
    }
    
    // Game name and strategy
    doc.setFontSize(14);
    doc.text(`${index + 1}. ${game.name} - ${combo.strategy === 'standard' ? 'Standard' : 'Alta Variabilità'}`, 15, yPos);
    yPos += 10;
    
    // Numbers
    doc.setFontSize(12);
    doc.text(`Numeri: ${combo.numbers.join(' - ')}`, 20, yPos);
    yPos += 7;
    
    // Date
    doc.text(`Generata il: ${new Date(combo.date).toLocaleDateString('it-IT')}`, 20, yPos);
    yPos += 15;
  });
  
  // Add disclaimer at the bottom
  const disclaimer = "⚠️ Questo strumento fornisce solo suggerimenti basati su dati statistici. Non garantisce vincite.";
  doc.setFontSize(10);
  doc.text(disclaimer, 15, 280);
  
  // Save PDF
  doc.save(`numerix_combinazioni_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Export to file using file-saver library
 * Dynamically imports file-saver to reduce initial bundle size
 */
export const saveToFile = async (
  content: Blob | string, 
  filename: string
): Promise<void> => {
  const { saveAs } = await import('file-saver');
  saveAs(content, filename);
};