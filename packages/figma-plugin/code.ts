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
    figma.notify(`✅ ¡${msg.images.length} iconos generados por GridXD!`);
    
    const nodes: SceneNode[] = [];
    let xOffset = 0;
    
    for (let i = 0; i < msg.images.length; i++) {
      const base64Data = msg.images[i].replace(/^data:image\/\w+;base64,/, "");
      // Convertir base64 a Uint8Array
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) {
        bytes[j] = binary.charCodeAt(j);
      }
      
      const image = figma.createImage(bytes);
      const rect = figma.createRectangle();
      
      // Tamaño estándar de bloque para iconos es 64x64
      rect.resize(64, 64);
      rect.x = figma.viewport.center.x + xOffset;
      rect.y = figma.viewport.center.y;
      rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FIT' }];
      rect.name = `gridxd-icon-${i+1}`;
      
      figma.currentPage.appendChild(rect);
      nodes.push(rect);
      
      xOffset += 80; // Espaciado entre iconos generados
    }
    
    // Seleccionar y hacer zoom en los iconos recién creados
    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
  }

  if (msg.type === 'extraction-fail') {
    figma.notify("❌ Hubo un error de procesamiento. Revisa tamaño o conexión.");
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
