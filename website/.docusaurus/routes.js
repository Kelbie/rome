
import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  
{
  path: '/',
  component: ComponentCreator('/'),
  exact: true,
  
},
{
  path: '/docs/:route',
  component: ComponentCreator('/docs/:route'),
  
  routes: [
{
  path: '/docs/community/contributing',
  component: ComponentCreator('/docs/community/contributing'),
  exact: true,
  
},
{
  path: '/docs/introduction/commands',
  component: ComponentCreator('/docs/introduction/commands'),
  exact: true,
  
},
{
  path: '/docs/introduction/getting-started',
  component: ComponentCreator('/docs/introduction/getting-started'),
  exact: true,
  
},
{
  path: '/docs/introduction/installation',
  component: ComponentCreator('/docs/introduction/installation'),
  exact: true,
  
}],
},
  
  {
    path: '*',
    component: ComponentCreator('*')
  }
];
