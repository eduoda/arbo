# ArboJS

A short documentation on using ArboJS.

- [Introduction](#Introduction)
- [Modules](#Modules)
  - [Base](#Base)
  - [Crypto Utils](#Crypto-Utils)
  - [Permission](#Permission)
  - [Section](#Section)
  - [User](#User)
  - [Var](#Var)
- [Usage examples](#Usage-examples)

# Introduction

ArboJS

# Modules

ArboJS is built of modules

## Base

This module defines some base methods to be shared by every other module implemented:

- `.setup(conn)`
- `.uninstall(conn)`
- `.ensurePermission(conn, userId, sectionId, permissionsIds)`
- `.searchDeep(conn, userId, offset, limit)`
- `.checkCRUDPermission(req, res, next, target)`

Additionally, ArboJS can also create `REST` endpoints automatically for every module implemented, creating `POST`, `GET`, `PUT` and `DELETE` routes.

> Example: a module named `User` will have the routes:
>
> - `POST: /User/`
> - `GET: /User/:id`
> - `PUT: /User/`
> - `DELETE: /User/:id`

## Crypto Utils

Contains some helper functions using Node's `crypto` package:

- `hash(salt, msg, enc = 'base64')`

  Hashes a `msg` using the given `salt` and returns the resulting hash encoded using the optional parameter `enc` (if not sent, will default to base64 encoding).

- `randomString(len)`

  Returns a random (safe) string with `len` characters.

## Permission

Module that controls permissions accross the application. This module defines the following tables:

- Permission

  A table that only lists existing permissions on the application, but doesn't grant them.
  Examples: `'read User'`, `'search Role'`, `'delete Permission'`.

- Role

  A table that lists existing roles on the application.
  Examples: `User`, `Admin`, `Guest`.

- RolePermission

  A table with the columns `role_id` and `permission_id` that connects the `Permission` and `Role` tables by their entries IDs.
  Example: An entry `{ role_id: 1, permission_id: 4 }` means that the `Role` with `id = 1` will be granted the `Permission` with `id = 4`.

- PermissionCache

  A "cache table" with the columns `user_id`, `permission_id`, `section_id`, `permission`, `membership_id`, `membership_role_id`, `role_id` and `role_permission_id` that puts all the relevant information to permissions together.

## Section

Module that controls the sections and memberships of users across the application. This module defines the following tables:

- Section

  A table that defines different sections of the application. (Users can have different permissions on different sections).

- Membership

  A table to store the membership of users on each section and the status of the membership.

- MembershipRole

  A table that links a membership to a role by their IDs.

## User

The user module, that controls registrations, authentication and other user-related functionalities. This module defines the following tables:

- User

  The basic entry of an user. Has the columns `login`, `email`, `password`, `salt` and `status`.

- Token

  A table to store the authentication token of users. These tokens are used to identify the user making requests and must be sent on all requests that require authentication/permission to access.

## Var

An auxiliary module that defines useful variables of the system. This modules defines the table `Var`, that stores these variables.
