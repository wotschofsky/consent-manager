import type ConsentManager from './ConsentManager';

export default class DOMConnector {
  constructor(private client: ConsentManager) {
    this.updateDOM();
    client.on('update', this.updateDOM.bind(this));
  }

  private selectElements() {
    return document.querySelectorAll(
      '[data-consent-manager]'
    ) as NodeListOf<HTMLElement>;
  }

  private isElementGranted(element: HTMLElement) {
    if (!('cmCategories' in element.dataset)) {
      console.warn('Element %d is missing cookie category!', element);
      return false;
    }

    const permittingCategories = (element.dataset.cmCategories as string)
      .split(',')
      .map((c) => c.trim());

    let isGranted = false;
    for (const category of permittingCategories) {
      if (this.client.grants[category]) {
        isGranted = true;
        break;
      }
    }

    const isInverted = 'cmInverted' in element.dataset;

    return isInverted ? !isGranted : isGranted;
  }

  private updateDOM() {
    const elements = this.selectElements();

    elements.forEach((el) => {
      if (!el.dataset.cmAttribute) {
        console.warn('Element %d is missing data-cm-attribute attribute!', el);
        return;
      }

      if (!el.dataset.cmValue) {
        console.warn('Element %d is missing data-cm-value attribute!', el);
        return;
      }

      if (this.isElementGranted(el)) {
        el.setAttribute(el.dataset.cmAttribute, el.dataset.cmValue);
      } else {
        el.removeAttribute(el.dataset.cmAttribute);
      }
    });
  }
}
