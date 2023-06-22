import Cookie from 'js-cookie';
import merge from 'deepmerge';
import { isPlainObject } from 'is-plain-object';

const validateCookie = (cookieValue: CookieData): boolean => {
  if (!isPlainObject(cookieValue)) {
    return false;
  }

  if (
    Object.keys(cookieValue)
      .sort((a, b) => a.localeCompare(b, 'en'))
      .join(',') !== 'grants,version'
  ) {
    return false;
  }

  if (typeof cookieValue.version !== 'string') {
    return false;
  }

  if (!isPlainObject(cookieValue.grants)) {
    return false;
  }

  if (Object.keys(cookieValue.grants).length === 0) {
    return false;
  }

  if (
    !Object.values(cookieValue.grants).every(
      (value) => typeof value === 'boolean'
    )
  ) {
    return false;
  }

  return true;
};

type GrantsStatus<G extends string> = Record<G, boolean>;

interface CookieData {
  version: string;
  grants: GrantsStatus<string>;
}

type EventNames = 'update' | 'grant' | 'revoke';

type UpdateEventCallback<G extends string> = (id: G) => void;

export interface ConsentManagerConfig<G extends string> {
  version: string;
  cookieName?: string;
  expires?: number | Date | 'session';
  categories: {
    id: G;
    label: string;
    description: string;
    required: boolean;
    default?: boolean;
  }[];
}

const defaultConfig: ConsentManagerConfig<never> = {
  version: '1',
  cookieName: 'consent-manager',
  expires: 365,
  categories: [],
};

export default class ConsentManager<G extends string = string> {
  public config: ConsentManagerConfig<G>;
  public isCustomized = false;
  public grants: GrantsStatus<G>;
  private eventListeners: Record<string, UpdateEventCallback<G>[]> = {};

  constructor(config: ConsentManagerConfig<G>) {
    this.config = merge(defaultConfig, config);

    this.parseCookie();
  }

  private parseCookie(): void {
    // Create object with default values
    const grants: GrantsStatus<string> = {};
    for (const category of this.config.categories) {
      // Set grant value to default value otherwise false
      const value = (category.required || category.default) ?? false;
      grants[category.id] = value;
    }

    // Load current cookie
    const cookieValue =
      Cookie.get('consent-manager') &&
      JSON.parse(Cookie.get('consent-manager'));

    if (cookieValue && validateCookie(cookieValue)) {
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
    Cookie.set(this.config.cookieName, JSON.stringify(cookieData), {
      expires: this.config.expires !== 'session' ? this.config.expires : null,
    });
  }

  public setGrant(id: G | '*', status: boolean): void {
    // Set all grants
    if (id === '*') {
      // Call recursively for all categories
      for (const key of Object.keys(this.grants)) {
        this.setGrant(key as G, status);
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

  public on(eventName: EventNames, callback: UpdateEventCallback<G>): void {
    // Add empty array for event listeners if missing
    if (!(eventName in this.eventListeners)) {
      this.eventListeners[eventName] = [];
    }

    this.eventListeners[eventName].push(callback);
  }

  public off(eventName: EventNames, callback: UpdateEventCallback<G>): void {
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

  private dispatch(eventName: EventNames, grant: G): void {
    // Ignore if no listeners are registered for event
    if (!(eventName in this.eventListeners)) {
      return;
    }

    for (const callback of this.eventListeners[eventName]) {
      callback(grant);
    }
  }
}
