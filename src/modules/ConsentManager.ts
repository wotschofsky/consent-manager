import { Validator } from '@cfworker/json-schema';
import Cookie from 'js-cookie';
import merge from 'deepmerge';

// Prepare validation of cookie data
const cookieValidator = new Validator({
  type: 'object',
  properties: {
    version: {
      type: 'string',
    },
    grants: {
      type: 'object',
      additionalProperties: {
        type: 'boolean',
      },
    },
  },
  required: ['version', 'grants'],
  additionalProperties: false,
});

// Setup instance of js-cookie for JSON
const CookieJson = Cookie.withConverter({
  read: (value) => JSON.parse(value),
  write: (value) => JSON.stringify(value),
});

type GrantsStatus = Record<string, boolean>;

interface CookieData {
  version: string;
  grants: GrantsStatus;
}

type UpdateEventCallback = (id: string) => void;

export interface ConsentManagerConfig {
  version: string;
  cookieName?: string;
  expires?: number | Date;
  categories: {
    id: string;
    label: string;
    description: string;
    required: boolean;
    default?: boolean;
  }[];
}

const defaultConfig: ConsentManagerConfig = {
  version: '1',
  cookieName: 'consent-manager',
  expires: 365,
  categories: [],
};

export default class ConsentManager {
  public config: ConsentManagerConfig;
  public isCustomized = false;
  public grants: GrantsStatus;
  private eventListeners: Record<string, UpdateEventCallback[]> = {};

  constructor(config: ConsentManagerConfig) {
    this.config = merge(defaultConfig, config);

    this.parseCookie();
  }

  private parseCookie(): void {
    // Load current cookie
    const cookieValue = CookieJson.get(
      this.config.cookieName
    ) as unknown as CookieData;

    // Create object with default values
    const grants: GrantsStatus = {};
    for (const category of this.config.categories) {
      // Set grant value to default value otherwise false
      const value = (category.required || category.default) ?? false;
      grants[category.id] = value;
    }

    if (cookieValue && cookieValidator.validate(cookieValue).valid) {
      // Set customized status current version up-to-date cookie was found
      if (cookieValue.version === this.config.version) {
        this.isCustomized = true;

        // Override grants if category was granted
        for (const category of this.config.categories) {
          // Ignore if category is required and therefore always true
          if (!category.required) {
            grants[category.id] = cookieValue.grants[category.id];
          }
        }
      }
    } else {
      console.warn(`Cookie "${this.config.cookieName}" is not a valid object.`);
    }

    this.grants = grants;
  }

  private writeCookie(): void {
    const cookieData: CookieData = {
      version: this.config.version,
      grants: this.grants,
    };
    CookieJson.set(this.config.cookieName, cookieData, {
      expires: this.config.expires,
    });
  }

  public setGrant(id: string, status: boolean): void {
    // Set all grants
    if (id === '*') {
      // Call recursively for all categories
      for (const key of Object.keys(this.grants)) {
        this.setGrant(key, status);
      }
      return;
    }

    // Abort if category doesn't exist
    if (!(id in this.grants)) {
      return;
    }

    // Abort if category is required
    const isRequired = this.config.categories.find(
      (el) => el.id === id
    )?.required;
    if (isRequired) {
      return;
    }

    this.grants[id] = status;

    // Dispatch events
    const eventType = status ? 'grant' : 'revoke';
    this.dispatch('update', id);
    this.dispatch(eventType, id);

    this.isCustomized = true;
    this.writeCookie();
  }

  public on(
    eventName: 'update' | 'grant' | 'revoke',
    callback: UpdateEventCallback
  ): void {
    // Add empty array for event listeners if missing
    if (!(eventName in this.eventListeners)) {
      this.eventListeners[eventName] = [];
    }

    this.eventListeners[eventName].push(callback);
  }

  public off(
    eventName: 'update' | 'grant' | 'revoke',
    callback: UpdateEventCallback
  ): void {
    // Ignore if no listeners are registered for event
    if (
      !(eventName in this.eventListeners) ||
      this.eventListeners[eventName].length === 0
    ) {
      return;
    }

    // Find and remove listener callback
    const callbackIndex = this.eventListeners[eventName].indexOf(callback);
    this.eventListeners[eventName].splice(callbackIndex, 1);
  }

  private dispatch(
    eventName: 'update' | 'grant' | 'revoke',
    grant: string
  ): void {
    // Ignore if no listeners are registered for event
    if (!(eventName in this.eventListeners)) {
      return;
    }

    for (const callback of this.eventListeners[eventName]) {
      callback(grant);
    }
  }
}
