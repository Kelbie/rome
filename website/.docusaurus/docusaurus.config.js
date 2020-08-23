export default {
  "plugins": [],
  "themes": [],
  "customFields": {},
  "themeConfig": {
    "image": "img/rome-logo-black.svg",
    "navbar": {
      "title": "Rome",
      "logo": {
        "alt": "Rome Logo",
        "src": "img/rome-logo-black.svg",
        "srcDark": "img/rome-logo-white.svg"
      },
      "links": [
        {
          "to": "docs/introduction/installation/",
          "label": "Docs",
          "position": "left"
        },
        {
          "href": "https://github.com/romejs/rome",
          "label": "GitHub",
          "position": "right"
        }
      ]
    },
    "footer": {
      "style": "dark",
      "links": [
        {
          "title": "Docs",
          "items": [
            {
              "label": "Installation",
              "to": "docs/introduction/installation"
            },
            {
              "label": "Getting Started",
              "to": "docs/introduction/getting-started/"
            }
          ]
        },
        {
          "title": "Community",
          "items": [
            {
              "label": "Code of Conduct",
              "href": "https://github.com/romejs/rome/blob/master/.github/CODE_OF_CONDUCT.md"
            },
            {
              "label": "Contributing",
              "to": "docs/community/Contributing"
            }
          ]
        },
        {
          "title": "More Resources",
          "items": [
            {
              "label": "GitHub",
              "href": "https://github.com/romejs/rome"
            }
          ]
        }
      ],
      "logo": {
        "alt": "Facebook Open Source Logo",
        "src": "img/oss_logo.png",
        "href": "https://opensource.facebook.com/"
      },
      "copyright": "Copyright © 2020 Facebook, Inc. Built with Docusaurus."
    }
  },
  "title": "Rome",
  "tagline": "An experimental JavaScript toolchain",
  "url": "https://romejs.dev",
  "baseUrl": "/",
  "favicon": "img/favicon.ico",
  "organizationName": "romejs",
  "projectName": "rome",
  "stylesheets": [
    "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap"
  ],
  "presets": [
    [
      "@docusaurus/preset-classic",
      {
        "docs": {
          "sidebarPath": "/Users/kelbie/Documents/Github/rome/website/sidebars.js"
        },
        "theme": {
          "customCss": "/Users/kelbie/Documents/Github/rome/website/src/css/custom.css"
        }
      }
    ]
  ]
};