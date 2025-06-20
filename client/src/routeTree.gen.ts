/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as SignupImport } from './routes/signup'
import { Route as SettingsImport } from './routes/settings'
import { Route as OrauthImport } from './routes/or_auth'
import { Route as LoginImport } from './routes/login'
import { Route as ChatImport } from './routes/chat'
import { Route as IndexImport } from './routes/index'
import { Route as ChatIndexImport } from './routes/chat/index'
import { Route as ChatChatIdImport } from './routes/chat/$chatId'

// Create/Update Routes

const SignupRoute = SignupImport.update({
  id: '/signup',
  path: '/signup',
  getParentRoute: () => rootRoute,
} as any)

const SettingsRoute = SettingsImport.update({
  id: '/settings',
  path: '/settings',
  getParentRoute: () => rootRoute,
} as any)

const OrauthRoute = OrauthImport.update({
  id: '/or_auth',
  path: '/or_auth',
  getParentRoute: () => rootRoute,
} as any)

const LoginRoute = LoginImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)

const ChatRoute = ChatImport.update({
  id: '/chat',
  path: '/chat',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const ChatIndexRoute = ChatIndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => ChatRoute,
} as any)

const ChatChatIdRoute = ChatChatIdImport.update({
  id: '/$chatId',
  path: '/$chatId',
  getParentRoute: () => ChatRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/chat': {
      id: '/chat'
      path: '/chat'
      fullPath: '/chat'
      preLoaderRoute: typeof ChatImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/or_auth': {
      id: '/or_auth'
      path: '/or_auth'
      fullPath: '/or_auth'
      preLoaderRoute: typeof OrauthImport
      parentRoute: typeof rootRoute
    }
    '/settings': {
      id: '/settings'
      path: '/settings'
      fullPath: '/settings'
      preLoaderRoute: typeof SettingsImport
      parentRoute: typeof rootRoute
    }
    '/signup': {
      id: '/signup'
      path: '/signup'
      fullPath: '/signup'
      preLoaderRoute: typeof SignupImport
      parentRoute: typeof rootRoute
    }
    '/chat/$chatId': {
      id: '/chat/$chatId'
      path: '/$chatId'
      fullPath: '/chat/$chatId'
      preLoaderRoute: typeof ChatChatIdImport
      parentRoute: typeof ChatImport
    }
    '/chat/': {
      id: '/chat/'
      path: '/'
      fullPath: '/chat/'
      preLoaderRoute: typeof ChatIndexImport
      parentRoute: typeof ChatImport
    }
  }
}

// Create and export the route tree

interface ChatRouteChildren {
  ChatChatIdRoute: typeof ChatChatIdRoute
  ChatIndexRoute: typeof ChatIndexRoute
}

const ChatRouteChildren: ChatRouteChildren = {
  ChatChatIdRoute: ChatChatIdRoute,
  ChatIndexRoute: ChatIndexRoute,
}

const ChatRouteWithChildren = ChatRoute._addFileChildren(ChatRouteChildren)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/chat': typeof ChatRouteWithChildren
  '/login': typeof LoginRoute
  '/or_auth': typeof OrauthRoute
  '/settings': typeof SettingsRoute
  '/signup': typeof SignupRoute
  '/chat/$chatId': typeof ChatChatIdRoute
  '/chat/': typeof ChatIndexRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/login': typeof LoginRoute
  '/or_auth': typeof OrauthRoute
  '/settings': typeof SettingsRoute
  '/signup': typeof SignupRoute
  '/chat/$chatId': typeof ChatChatIdRoute
  '/chat': typeof ChatIndexRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/chat': typeof ChatRouteWithChildren
  '/login': typeof LoginRoute
  '/or_auth': typeof OrauthRoute
  '/settings': typeof SettingsRoute
  '/signup': typeof SignupRoute
  '/chat/$chatId': typeof ChatChatIdRoute
  '/chat/': typeof ChatIndexRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/chat'
    | '/login'
    | '/or_auth'
    | '/settings'
    | '/signup'
    | '/chat/$chatId'
    | '/chat/'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/login'
    | '/or_auth'
    | '/settings'
    | '/signup'
    | '/chat/$chatId'
    | '/chat'
  id:
    | '__root__'
    | '/'
    | '/chat'
    | '/login'
    | '/or_auth'
    | '/settings'
    | '/signup'
    | '/chat/$chatId'
    | '/chat/'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  ChatRoute: typeof ChatRouteWithChildren
  LoginRoute: typeof LoginRoute
  OrauthRoute: typeof OrauthRoute
  SettingsRoute: typeof SettingsRoute
  SignupRoute: typeof SignupRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  ChatRoute: ChatRouteWithChildren,
  LoginRoute: LoginRoute,
  OrauthRoute: OrauthRoute,
  SettingsRoute: SettingsRoute,
  SignupRoute: SignupRoute,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/chat",
        "/login",
        "/or_auth",
        "/settings",
        "/signup"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/chat": {
      "filePath": "chat.tsx",
      "children": [
        "/chat/$chatId",
        "/chat/"
      ]
    },
    "/login": {
      "filePath": "login.tsx"
    },
    "/or_auth": {
      "filePath": "or_auth.tsx"
    },
    "/settings": {
      "filePath": "settings.tsx"
    },
    "/signup": {
      "filePath": "signup.tsx"
    },
    "/chat/$chatId": {
      "filePath": "chat/$chatId.tsx",
      "parent": "/chat"
    },
    "/chat/": {
      "filePath": "chat/index.tsx",
      "parent": "/chat"
    }
  }
}
ROUTE_MANIFEST_END */
