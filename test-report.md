# PA2 Test Report

**Project:** Investment Purchase Tracker with Secure Backend

**Testing environment:** macOS, Safari, Node.js, Express, SQLite

## Automated Tests

**Status: Pass**

Ran `npm test`. All 5 automated validation tests passed.

## Check 1 — Registration and Login

**Status: Pass**

Registered two fictional users. Duplicate email registration was rejected, passwords shorter than the required minimum were rejected, and incorrect login credentials produced an error without revealing account details.

## Check 2 — Authentication and CSRF Protection

**Status: Pass**

A purchase request while logged out returned `Login required`. A purchase creation request without a valid CSRF token was rejected with HTTP 403. No unauthorized purchase was created.

## Check 3 — Add Purchases

**Status: Pass**

Added Example Index Fund (5 × $20.00) and Example Company (3 × $15.50). The application displayed two purchases totaling $146.50.

## Check 4 — Database Persistence

**Status: Pass — Persistence verified**

Confirmed that purchase data remained available after refreshing the page and restarting the server. Persistence was verified using the remaining purchase after editing and deletion, rather than the original two-record state.

**Evidence:** `screenshots/purchase-history.png`

## Check 5 — Edit and Delete

**Status: Pass**

Changed Example Company quantity from 3 to 4. The total updated to $162.00. Deleted Example Index Fund, leaving one purchase totaling $62.00.

## Check 6 — Account Isolation and Ownership

**Status: Pass**

User B could not view User A's purchases. Direct PUT and DELETE requests targeting User A's purchase returned HTTP 404. Supplying `ownerId` in a purchase creation request did not assign the purchase to User A.

**Evidence:** `screenshots/account-isolation.png`

## Check 7 — Server-Side Input Validation

**Status: Pass**

Tested blank names, invalid quantities, invalid prices, nonnumeric quantity input, and an unknown category. All nine invalid requests returned HTTP 400, and the number of purchases remained unchanged.

## Check 8 — Safe HTML Display and Duplicate Names

**Status: Pass**

Created two purchases named `<b>Example</b>`. Both were stored as separate records, and the HTML tags appeared as literal text instead of being interpreted as formatting.

## Check 9 — Connection Error Handling

**Status: Pass**

Stopped the server before submitting a purchase. The application displayed a connection error, preserved the entered values, and restored the Add Purchase button. The message advised checking the purchase list before retrying if a save might have completed.

## Check 10 — API Errors and Submission Security

**Status: Pass*

An unknown API route returned HTTP 404 with a JSON error. Malformed JSON returned HTTP 400 with the JSON error message Invalid JSON.

Verified that `.gitignore` excludes `.env`, `node_modules/`, SQLite database files, and macOS metadata.
