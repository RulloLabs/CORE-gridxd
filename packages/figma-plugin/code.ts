// Este script es el backend del plugin de Figma
figma.showUI(__html__, { width: 340, height: 420 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'extract-icons') {
    // 1. Obtener la selección actual del usuario
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.notify("⚠️ Selecciona un Frame o Imagen primero.");
      return;
    }

    try {
      const node = selection[0];
      
      // 2. Exportar el nodo seleccionado a Uint8Array (PNG)
      const bytes = await node.exportAsync({ format: 'PNG' });
      
      // 3. Enviar al UI (iframe) para llamar a nuestra API
      figma.ui.postMessage({ 
        type: 'upload-image', 
        bytes: Array.from(bytes),
        name: node.name
      });
      
    } catch (e) {
      figma.notify("❌ Error al exportar la selección.");
    }
  }

  if (msg.type === 'extraction-success') {
    figma.notify(`✅ ¡${msg.count} iconos extraídos con éxito vía GridXD!`);
    // En el futuro: importar SVG/PNG de vuelta al lienzo
  }

  if (msg.type === 'extraction-fail') {
    figma.notify("❌ Hubo un error de procesamiento. Revisa tamaño o conexión.");
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
