figma.showUI(__html__, { width: 640, height: 480 });

// Функция для капитализации первой буквы строки
function capitalizeFirstLetter(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Функция для удаления знаков препинания в конце строки (., :, ;, ,)
function trimEndPunctuation(str) {
  return str.replace(/[.,:;]+$/g, '');
}

// Функция отправки количества выбранных текстовых слоёв в UI
function sendSelectedCount() {
  const selected = figma.currentPage.selection;
  const selectedTextNodes = selected.filter(node => node.type === "TEXT");
  figma.ui.postMessage({ type: 'update-selected-count', count: selectedTextNodes.length });
}

sendSelectedCount();

figma.on("selectionchange", () => {
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

    let lines;

    if (fillAllWithFirstLine) {
      const firstLine = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)[0] || '';

      let trimmed = firstLine;
      if (removePunctuation) trimmed = trimEndPunctuation(trimmed);
      const processedLine = capitalize ? capitalizeFirstLetter(trimmed) : trimmed;

      lines = new Array(msg.selectedCount).fill(processedLine);
    } else {
      lines = text
        .split('\n')
        .map(line => {
          let trimmed = line.trim();
          if (removePunctuation) trimmed = trimEndPunctuation(trimmed);
          return capitalize ? capitalizeFirstLetter(trimmed) : trimmed;
        })
        .filter(line => line.length > 0);
    }

    const selected = figma.currentPage.selection;
    const selectedTextNodes = selected.filter(node => node.type === "TEXT");

    if (!fillAllWithFirstLine && selectedTextNodes.length !== lines.length) {
      figma.notify('Количество выбранных текстовых слоёв должно совпадать с количеством строк!');
      figma.ui.postMessage({ error: true });
      return;
    }

    if (selectedTextNodes.length === 0) {
      figma.notify('Выделите хотя бы один текстовый слой!');
      figma.ui.postMessage({ error: true });
      return;
    }

    for (let i = 0; i < selectedTextNodes.length; i++) {
      const textNode = selectedTextNodes[i];
      await figma.loadFontAsync(textNode.fontName);
      textNode.characters = lines[i];
    }

    figma.notify('Текст успешно вставлен по слоям!');
    figma.ui.postMessage({ success: true });
    // figma.closePlugin();
  }
};
