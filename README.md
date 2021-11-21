[![npm](https://img.shields.io/npm/v/consent-manager)](https://www.npmjs.com/package/keycode-to-codes)

# consent-manager

consent-manager aims to provide a comprehensive, flexible, accessible and privacy friendly cookie consent management solution for every project.
Most cookie consent management solutions are either super basic or are proprietary. Additionally they may only offer you their pre-designed UI which doesn't fit every design.
consent-manager allows you to only use the components you need. Anything from just the core consent management feature to the entire suite of bundled add-ons including ready-to-use UI components, integration with the DOM or blocking of cookies for any script (coming soon!) works!

## Getting started

Add the script to your project through a package manager:

`$ npm i consent-manager`

or

`$ yarn add consent-manager`

Alternatively you can also import the script found in the releases section on GitHub directly. If you choose this option you won't need to import the individual classes going forward - they will all be available to you automatically.

```html
<script src="consent-manager.min.js"></script>
```

Or include through a public CDN:

```html
<script src="https://unpkg.com/consent-manager@1/dist/consent-manager.min.js"></script>
```

## Core

First create a new ConsentManager object by passing a config:

```javascript
import ConsentManager from 'consent-manager';

const consentManager = new ConsentManager({
  // Version of the current configuration
  // When this changes all current consent preferences will be disregarded
  // string - required
  version: '2021-01-01',

  // Name of the cookie containing preferences
  // string - optional - defaults to "consent-manager"
  cookieName: 'consent-manager',

  // How long until cookie containing preferences expires
  // number (days), Date object or "session" (until end of session) - optional - defaults to 365 days
  expires: 365,

  // Array of all toggleable categories by which cookies will be sorted; adjust to according to your needs
  categories: [
    {
      // Unique identifier
      // string - required
      id: 'essential',

      // Human understandable label
      // string - required
      label: 'Essential Cookies',

      // Explanation of category's purpose
      // string - required
      description: 'Required for basic functionality',

      // If required a category cannot be disabled
      // boolean - required
      required: true,
    },
    {
      // Unique identifier
      // string - required
      id: 'analytics',

      // Human understandable label
      // string - required
      label: 'Analytics Cookies',
      description: 'Visitor statistics used to improve content',

      // If required a category cannot be disabled
      // boolean - required
      required: false,

      // Default value of category
      // boolean - optional - defaults to false
      default: true,
    }
  ]
});
```

### Properties

#### config

```javascript
consentManager.config

// Example: see object initialization above
```

#### grants

Key-value pairs of category ids and their current status indicated as boolean.

```javascript
consentManager.grants

// Example:
// {
//   "essential": true
//   "analytics": false
// }
```

#### isCustomized

Boolean indicating whether the preferences were customized by the user.

```javascript
consentManager.isCustomized
```

### Methods

#### setGrant

Modify current status of one or multiple categories.

```javascript
consentManager.setGrant(categoryId, status);

// Example - single category:
consentManager.setGrant('analytics', true);

// Example - all not required categories:
consentManager.setGrant('*', false);
```

#### on

Listen for events. Available events:

* `grant` (category was granted)
* `revoke` (category was revoked)
* `update` (category was either granted or revoked)

```javascript
consentManager.on(eventType, callback);

// Example
consentManager.on('update', (id) => {
  console.log(`Category ${id} was changed!`);
});
```

#### off

Remove event listener. Make sure to pass the exact same function reference as when creating the listener.

```javascript
consentManager.off(eventType, callback);

// Example
consentManager.off('update', updateListener);
```

## DOMConnector

DOMConnector allows you to modify the DOM based on user preferences without writing any custom logic by providing a set of *data-* attributes.

### Initialization

```javascript
import { DOMConnector } from 'consent-manager';

new DOMConnector(consentManager);
```

### Attributes

`data-consent-manager` - Required to make DOMConnector aware of element

`data-cm-categories="category1, category2"` - Comma separated list of enabling categories

`data-cm-inverted` - Inverts granted status

`data-cm-attribute="name"` - Attribute which will be set when enabled

`data-cm-value="value"` - Value of the attribute

### Usage Examples

#### Load script conditionally

```html
<script
  data-consent-manager
  data-cm-categories="analytics"
  data-cm-attribute="src"
  data-cm-value="https://analytics-provider.com/script.js"
></script>
```

#### Show info text if consent not given

```html
<style>
  p {
    display: none;
  }
</style>

<p
  data-consent-manager
  data-cm-categories="experience"
  data-cm-inverted
  data-cm-attribute="style"
  data-cm-value="display: block;"
>
  Please consent to the use of cookies to use this feature!
</p>
```

## GrantsInterface

GrantsInterface provides ready-made UI elements for your users to set their preferences.

### Usage

You already get the entire functionality just by creating a GrantsInterface object including a cookie banner that only shows up until users set their preferences and a modal where users can customize their preferences in detail. Make sure to also include the stylesheet or create your own one.

```javascript
import { GrantsInterface } from 'consent-manager';
import 'consent-manager/dist/consent-manager.css';

new GrantsInterface(consentManager);
```

Include the stylesheet through a public CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/consent-manager@1/dist/consent-manager.min.css">
```

If you want more control over the behavior of the UI elements you can disable them being shown automatically and use the following methods to control them manually instead:

```javascript
const gi = new GrantsInterface(consentManager, { autoShow: false });

// Show cookie banner
gi.showBanner();

// Hide cookie banner
gi.hideBanner();

// Show preferences modal
gi.showModal();

// Hide preferences modal
gi.hideModal();
```

Additionally you may want to customize the text values shown in interface. You can change as many or as few as you'd like and simply leave the others unspecified:

```javascript
new GrantsInterface(consentManager, {
  languageStrings: {
    banner: {
      infoText: 'This website uses cookies to ensure you get the best experience on our website.',
      accept: 'Accept All',
      reject: 'Only required',
      options: 'More options'
    },
    modal: {
      title: 'Consent options',
      accept: 'Accept All',
      reject: 'Only required'
    }
  }
});
```

If you want to use the consent table used in the modal you can generate one yourself using `generateConsentTable`:

```javascript
// Generate table element linked to ConsentManager
const table = gi.generateConsentTable();

// Generate table element linked to ConsentManager that updates when preferences change elsewhere
const table = gi.generateConsentTable(true);
```
