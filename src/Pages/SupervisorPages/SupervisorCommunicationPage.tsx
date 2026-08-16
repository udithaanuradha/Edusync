/**
 * RE-EXPORT PATTERN
 *
 * This file acts as an "index" or a "proxy". Instead of defining logic here,
 * it pulls the 'default' export from the CommunicationPage file and
 * pushes it out as the 'default' export of this directory.
 *
 * Why use this?
 * 1. Cleaner Imports: Allows other files to import from the folder
 *    path (e.g., '../../pages/Communication') rather than the full
 *    file path (e.g., '../../pages/shared/CommunicationPage').
 * 2. Organization: Keeps role-specific pages grouped together even
 *    if they share a common base component.
 */
export { default } from "../shared/CommunicationPage";
