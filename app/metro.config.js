// Metro's project root defaults to this directory, so it never sees
// anything outside app/ unless told to. domain/events/content.ts imports
// JSON directly from ../data (the single source of event content truth,
// not a copy mirrored into app/) — watchFolders is what lets Metro follow
// that import instead of failing to resolve it.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [path.resolve(workspaceRoot, 'data')];

module.exports = config;
