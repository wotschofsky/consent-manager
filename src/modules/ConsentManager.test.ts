import { expect, describe, beforeEach, vi, test } from 'vitest';
import Cookie from 'js-cookie';

import ConsentManager from './ConsentManager';

describe('ConsentManager', () => {
  beforeEach(() => {
    Cookie.remove('consent-manager');
  });

  test('constructor - default config', () => {
    const consentManager = new ConsentManager({
      version: '1',
      categories: [],
    });

    expect(consentManager.config.version).toBe('1');
    expect(consentManager.config.cookieName).toBe('consent-manager');
    expect(consentManager.isCustomized).toBe(false);
  });

  test('constructor - valid cookie', () => {
    Cookie.set(
      'consent-manager',
      JSON.stringify({
        version: '1',
        grants: { test: true },
      })
    );

    const consentManager = new ConsentManager({
      version: '1',
      categories: [
        {
          id: 'test',
          label: 'Test',
          description: 'Test category',
          required: false,
        },
      ],
    });

    expect(consentManager.config.version).toBe('1');
    expect(consentManager.config.cookieName).toBe('consent-manager');
    expect(consentManager.isCustomized).toBe(true);
    expect(consentManager.grants.test).toBe(true);
  });

  test('setGrant - required category', () => {
    const consentManager = new ConsentManager({
      version: '1',
      categories: [
        {
          id: 'test',
          label: 'Test',
          description: 'Test category',
          required: true,
        },
      ],
    });

    consentManager.setGrant('test', false);
    expect(consentManager.grants.test).toBe(true);
    expect(consentManager.isCustomized).toBe(false);
  });

  test('setGrant - optional category', () => {
    const consentManager = new ConsentManager({
      version: '1',
      categories: [
        {
          id: 'test',
          label: 'Test',
          description: 'Test category',
          required: false,
        },
      ],
    });

    consentManager.setGrant('test', true);
    expect(consentManager.grants.test).toBe(true);
    expect(consentManager.isCustomized).toBe(true);
  });

  test('setGrant - invalid category', () => {
    const consentManager = new ConsentManager({
      version: '1',
      categories: [],
    });

    consentManager.setGrant('test', true);
    expect(consentManager.grants.test).toBeUndefined();
    expect(consentManager.isCustomized).toBe(false);
  });

  test('event listener handling', () => {
    const consentManager = new ConsentManager({
      version: '1',
      categories: [
        {
          id: 'test',
          label: 'Test',
          description: 'Test category',
          required: false,
        },
      ],
    });

    const callback = vi.fn();

    consentManager.on('update', callback);
    consentManager.setGrant('test', true);
    expect(callback).toHaveBeenCalledOnce();

    consentManager.off('update', callback);
    consentManager.setGrant('test', false);
    expect(callback).toHaveBeenCalledOnce();
  });
});
