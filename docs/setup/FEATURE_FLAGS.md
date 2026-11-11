# Feature Flags - Temporarily Hidden Features

## Overview
This document tracks features that have been temporarily hidden but can be restored later. All code is preserved in the codebase.

## Hidden Features

### 1. Email Reminders Feature Card (About Page)
- **Location**: About section → "Smart Follow-ups" feature card
- **Status**: Blurred with "Coming Soon" overlay
- **Why Hidden**: Email automation feature not ready for launch

### 2. Networking Assistant Settings (Strengthening the Net Section)
- **Location**: Strengthening the Net section → "Set Up Your Networking Assistant"
- **Status**: Commented out (hidden from view)
- **Why Hidden**: Email assistant settings not ready for launch

## How to Restore Features

### To Restore Email Reminders Feature Card:

1. Open `index.html`
2. Find the "Smart Follow-ups" feature card (around line 101-106)
3. Remove the "coming-soon" class and the "Coming Soon" overlay div
4. The code is still there, just wrapped in a div with blur effect

### To Restore Networking Assistant Settings:

1. Open `index.html`
2. Find the comment `<!-- TEMPORARILY HIDDEN: Networking Assistant Settings -->`
3. Find the closing comment `<!-- END TEMPORARILY HIDDEN: Networking Assistant Settings -->`
4. Uncomment the section between these comments (remove the comment tags)
5. The code is preserved between lines ~665-805

### Quick Restore Command:
To restore both features, search for:
- `TEMPORARILY HIDDEN` in `index.html`
- Remove comment tags and restore the sections

## Code Locations

### Email Reminders Card:
- **File**: `index.html`
- **Lines**: ~101-106 (in About section)
- **Look for**: `<div class="feature-card coming-soon">`

### Assistant Settings:
- **File**: `index.html`
- **Lines**: ~665-805 (in Strengthening the Net section)
- **Look for**: Comment blocks with `TEMPORARILY HIDDEN`

## When Ready to Restore

Simply ask: "Restore the email reminders and assistant settings features" and I'll uncomment/restore the code for you.
