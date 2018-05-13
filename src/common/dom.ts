export function appendDomElement<K extends keyof HTMLElementTagNameMap>(tagName: K, parent: Element) {
  const element = document.createElement<K>(tagName);
  parent.appendChild(element);
  const remove = () => {
    parent.removeChild(element);
  };
  return { element, remove };
}

export function setCanvasSize(canvas: HTMLCanvasElement, width: number, height: number): void {
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
}
