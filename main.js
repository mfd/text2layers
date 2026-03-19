figma.showUI(__html__, { width: 640, height: 420 });

// Capitalize first letter of a string
function capitalizeFirstLetter(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Remove punctuation at the end of a line (., :, ;, ,)
function trimEndPunctuation(str) {
  return str.replace(/[.,:;]+$/g, '');
}

// Send number of selected text layers to UI
function sendSelectedCount() {
  const selected = figma.currentPage.selection;
  const selectedTextNodes = selected.filter(node => node.type === 'TEXT');
  figma.ui.postMessage({
    type: 'update-selected-count',
    count: selectedTextNodes.length,
  });
}

sendSelectedCount();

figma.on('selectionchange', () => {
  sendSelectedCount();
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'request-selected-count') {
    sendSelectedCount();
    return;
  }

  if (msg.type === 'split-and-insert') {
    const text = msg.text || '';
    const capitalize = !!msg.capitalize;
    const removePunctuation = !!msg.removePunctuation;
    const fillAllWithFirstLine = !!msg.fillAllWithFirstLine;

    // Take only TEXT nodes in the order of current selection (Layers panel order)
    const selectedTextNodes = figma.currentPage.selection.filter(
      node => node.type === 'TEXT'
    );

    if (selectedTextNodes.length === 0) {
      figma.notify('Select at least one text layer!');
      figma.ui.postMessage({ error: true });
      return;
    }

    let lines;

    if (fillAllWithFirstLine) {
      // Use first non-empty line for all layers
      const firstLine =
        text
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)[0] || '';

      let trimmed = firstLine;
      if (removePunctuation) trimmed = trimEndPunctuation(trimmed);
      const processedLine = capitalize
        ? capitalizeFirstLetter(trimmed)
        : trimmed;

      lines = new Array(selectedTextNodes.length).fill(processedLine);
    } else {
      // Normal mode: one line per layer
      lines = text
        .split('\n')
        .map(line => {
          let trimmed = line.trim();
          if (removePunctuation) trimmed = trimEndPunctuation(trimmed);
          return capitalize ? capitalizeFirstLetter(trimmed) : trimmed;
        })
        .filter(line => line.length > 0);

      if (selectedTextNodes.length !== lines.length) {
        figma.notify(
          'Number of selected text layers must match number of lines!'
        );
        figma.ui.postMessage({ error: true });
        return;
      }
    }

    // Apply text to layers in selection order
    for (let i = 0; i < selectedTextNodes.length; i++) {
      const textNode = selectedTextNodes[i];
      const line = lines[i];
      if (line === undefined) continue;

      // Load fonts safely
      const font = textNode.fontName;
      if (font && font.family && font.style) {
        await figma.loadFontAsync(font);
      } else {
        const len = textNode.characters.length;
        const fontNames = textNode.getRangeAllFontNames(0, len);
        for (const f of fontNames) {
          await figma.loadFontAsync(f);
        }
      }

      textNode.characters = line;
    }

    figma.notify('Text successfully applied to layers!');
    figma.ui.postMessage({ success: true });
    // figma.closePlugin();
  }
};
