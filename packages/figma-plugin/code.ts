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
      if (!node) return;
      
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
    figma.notify(`✅ ¡${msg.icons.length} activos procesados!`);
    
    const nodes: SceneNode[] = [];
    let xOffset = 0;
    
    for (const icon of msg.icons) {
      if (icon.svg) {
        // Insert as SVG (Vector)
        try {
          const svgNode = figma.createNodeFromSvg(icon.svg);
          svgNode.x = figma.viewport.center.x + xOffset;
          svgNode.y = figma.viewport.center.y;
          svgNode.name = icon.name || "gridxd-vector";
          figma.currentPage.appendChild(svgNode);
          nodes.push(svgNode);
        } catch (err) {
          figma.notify("Error inserting SVG", { error: true });
        }
      } else if (icon.image) {
        // Insert as Image (Raster)
        const base64Data = icon.image.replace(/^data:image\/\w+;base64,/, "");
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let j = 0; j < binary.length; j++) {
          bytes[j] = binary.charCodeAt(j);
        }
        
        const image = figma.createImage(bytes);
        const rect = figma.createRectangle();
        rect.resize(64, 64);
        rect.x = figma.viewport.center.x + xOffset;
        rect.y = figma.viewport.center.y;
        rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FIT' }];
        rect.name = icon.name || "gridxd-icon";
        
        figma.currentPage.appendChild(rect);
        nodes.push(rect);
      }
      
      xOffset += 100;
    }
    
    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
  }

  if (msg.type === 'insert-svg') {
    try {
      const node = figma.createNodeFromSvg(msg.svg);
      node.x = figma.viewport.center.x;
      node.y = figma.viewport.center.y;
      node.name = msg.name || "gridxd-ai-icon";
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
      figma.notify("✨ Icono inyectado correctamente");
    } catch (e) {
      figma.notify("❌ Error al procesar el SVG");
    }
  }

  if (msg.type === 'extraction-fail') {
    figma.notify("❌ Hubo un error de procesamiento. Revisa tamaño o conexión.");
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
