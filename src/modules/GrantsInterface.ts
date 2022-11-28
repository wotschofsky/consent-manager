import merge from 'deepmerge';

import type ConsentManager from './ConsentManager';

interface GrantsInterfaceConfig {
  autoShow?: boolean;
  languageStrings?: {
    banner?: {
      infoText?: string;
      accept?: string;
      reject?: string;
      options?: string;
    };
    modal?: {
      title?: string;
      accept?: string;
      reject?: string;
    };
  };
}

const defaultConfig: GrantsInterfaceConfig = {
  autoShow: true,
  languageStrings: {
    banner: {
      infoText:
        'This website uses cookies to ensure you get the best experience on our website.',
      accept: 'Accept All',
      reject: 'Only required',
      options: 'More options',
    },
    modal: {
      title: 'Consent options',
      accept: 'Accept All',
      reject: 'Only required',
    },
  },
};

export default class GrantsInterface {
  private config: GrantsInterfaceConfig;

  constructor(private client: ConsentManager, config?: GrantsInterfaceConfig) {
    this.config = merge(defaultConfig, config ?? {});

    if (this.config.autoShow && !client.isCustomized) {
      this.showBanner();
    }
  }

  public showBanner(): void {
    const existingBanner = document.querySelector(
      '.consent-manager--banner-wrapper'
    );
    if (existingBanner) {
      return;
    }

    const infoText = document.createElement('span');
    infoText.textContent = this.config.languageStrings.banner.infoText;

    const infoSection = document.createElement('div');
    infoSection.className = 'consent-manager--banner-info';
    infoSection.append(infoText);

    const acceptButton = document.createElement('button');
    acceptButton.className = 'consent-manager--banner-accept';
    acceptButton.textContent = this.config.languageStrings.banner.accept;
    acceptButton.addEventListener('click', () =>
      this.client.setGrant('*', true)
    );

    const rejectButton = document.createElement('button');
    rejectButton.className = 'consent-manager--banner-reject';
    rejectButton.textContent = this.config.languageStrings.banner.reject;
    rejectButton.addEventListener('click', () =>
      this.client.setGrant('*', false)
    );

    const moreButton = document.createElement('button');
    moreButton.className = 'consent-manager--banner-more';
    moreButton.textContent = this.config.languageStrings.banner.options;
    moreButton.addEventListener(
      'click',
      () => {
        this.showModal();
        this.hideBanner();
      },
      { once: true }
    );

    const actionsSection = document.createElement('div');
    actionsSection.className = 'consent-manager--banner-actions';
    actionsSection.append(acceptButton, rejectButton, moreButton);

    const banner = document.createElement('aside');
    banner.className = 'consent-manager--banner-wrapper';
    banner.append(infoSection, actionsSection);

    document.body.append(banner);

    this.client.on('update', () => {
      if (this.client.isCustomized) {
        this.hideBanner();
      }
    });
  }

  public hideBanner(): void {
    const bannerEl = document.querySelector('.consent-manager--banner-wrapper');
    if (bannerEl) {
      bannerEl.remove();
    }
  }

  public generateConsentTable(autoUpdate = false): HTMLTableElement {
    const table = document.createElement('table');
    table.className = 'consent-manager--table';

    for (const category of this.client.config.categories) {
      const row = document.createElement('tr');
      row.className = 'consent-manager--row';

      const status = this.client.grants[category.id];
      const disabled = category.required ? 'disabled' : '';
      const checked = category.required || status ? 'checked' : '';
      row.innerHTML =
        `<td class="consent-manager--table-toggle-col">` +
        `  <input id="consent-manager--table-toggle-${category.id}" class="consent-manager--table-toggle" type="checkbox" ${checked} ${disabled} />` +
        `</td>` +
        `<td class="consent-manager--table-label-col">` +
        `  <label for="consent-manager--table-toggle-${category.id}">` +
        `    <span class="consent-manager--table-label">${category.label}</span>` +
        `    <sub class="consent-manager--table-description">${category.description}</sub>` +
        `  </label>` +
        `</td>`;
      if (!category.required) {
        const checkbox: HTMLInputElement = row.querySelector(
          'input[type="checkbox"]'
        );

        checkbox.addEventListener('change', (event) => {
          this.client.setGrant(
            category.id,
            (event.target as HTMLInputElement).checked
          );
        });

        if (autoUpdate) {
          this.client.on('update', (id) => {
            if (category.id === id) {
              checkbox.checked = this.client.grants[id];
            }
          });
        }
      }

      table.appendChild(row);
    }

    return table;
  }

  public showModal() {
    const modalEl = document.querySelector('.consent-manager--modal-backdrop');
    if (modalEl) {
      return;
    }

    const title = document.createElement('h2');
    title.className = 'consent-manager--modal-title';
    title.textContent = this.config.languageStrings.modal.title;

    const closeButton = document.createElement('span');
    closeButton.className = 'consent-manager--modal-close';
    closeButton.innerHTML = '&#x2715;';
    closeButton.addEventListener('click', () => this.hideModal(), {
      once: true,
    });

    const header = document.createElement('header');
    header.className = 'consent-manager--modal-header';
    header.append(title, closeButton);

    const table = this.generateConsentTable(true);

    const acceptAllButton = document.createElement('button');
    acceptAllButton.className = 'consent-manager--modal-accept';
    acceptAllButton.textContent = this.config.languageStrings.modal.accept;
    acceptAllButton.addEventListener('click', () =>
      this.client.setGrant('*', true)
    );

    const rejectAllButton = document.createElement('button');
    rejectAllButton.className = 'consent-manager--modal-reject';
    rejectAllButton.textContent = this.config.languageStrings.modal.reject;
    rejectAllButton.addEventListener('click', () =>
      this.client.setGrant('*', false)
    );

    const actions = document.createElement('footer');
    actions.className = 'consent-manager--modal-actions';
    actions.append(acceptAllButton, rejectAllButton);

    const modal = document.createElement('aside');
    modal.className = 'consent-manager--modal-container';
    modal.append(header, table, actions);

    const backdrop = document.createElement('div');
    backdrop.className = 'consent-manager--modal-backdrop';
    backdrop.append(modal);

    document.body.append(backdrop);

    backdrop.addEventListener(
      'click',
      (event) => {
        if (event.target === backdrop) {
          this.hideModal();
        }
      },
      { once: true }
    );
  }

  public hideModal() {
    const modalEl = document.querySelector('.consent-manager--modal-backdrop');
    if (modalEl) {
      modalEl.remove();
    }
  }
}
